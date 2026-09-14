import type { ProductQuery } from '#shared/domain/search'
import { UPSTREAM_SORT_FIELDS } from '#shared/domain/search'

/**
 * Lucene query construction for the upstream search service.
 *
 * Upstream parses `q` as a Lucene expression, so user input is not data unless
 * we make it data. It fails in the worst way available: a stray `:` or `"` does
 * not raise an error, it silently reinterprets the query and returns zero
 * matches. A user searching for a product whose name contains a colon would
 * just be told it does not exist.
 *
 * So the rule is the same one that applies to SQL. Structure is ours to write,
 * values are always escaped, and the two never get concatenated by accident.
 */

/**
 * Characters Lucene treats as syntax. `&` and `|` are included because the
 * operators are `&&` and `||`, and escaping the halves neutralises both.
 *
 * Source: Lucene classic query parser syntax, "Escaping Special Characters".
 */
const LUCENE_SPECIAL = /[+\-&|!(){}[\]^"~*?:\\/]/g

/** Escapes a value so Lucene reads every character of it literally. */
export function escapeLuceneTerm(input: string): string {
  return input.replace(LUCENE_SPECIAL, (char) => `\\${char}`)
}

/**
 * Wraps a value as a quoted phrase.
 *
 * Taxonomy ids contain a colon by design (`en:sweet-spreads`), which is exactly
 * the field separator. Quoting keeps the colon inside the value; only the quote
 * and backslash characters need escaping within a phrase.
 */
export function quoteLuceneValue(value: string): string {
  return `"${value.replace(/[\\"]/g, (char) => `\\${char}`)}"`
}

/** `field:(a OR b OR c)`, or an empty string when there is nothing to filter on. */
function tagClause(field: string, values: readonly string[]): string {
  if (values.length === 0) return ''

  const terms = values.map((value) => `${field}:${quoteLuceneValue(value)}`)

  // A single term needs no parentheses, and leaving them off keeps the query
  // readable in upstream logs when something has to be debugged by hand.
  return terms.length === 1 ? terms[0]! : `(${terms.join(' OR ')})`
}

/** Same shape, for fields whose values are bare enum tokens rather than ids. */
function enumClause(field: string, values: readonly (string | number)[]): string {
  if (values.length === 0) return ''
  const terms = values.map((value) => `${field}:${escapeLuceneTerm(String(value))}`)
  return terms.length === 1 ? terms[0]! : `(${terms.join(' OR ')})`
}

/**
 * Free text is escaped whole and left unquoted, so upstream still tokenises it
 * and matches across fields. Quoting it would turn "dark chocolate" into a
 * phrase match and quietly drop every product that says "chocolate, dark".
 */
function freeTextClause(text: string): string {
  const trimmed = text.trim()
  if (trimmed.length === 0) return ''

  const escaped = trimmed
    .split(/\s+/)
    .map(escapeLuceneTerm)
    .filter((term) => term.length > 0)
    .join(' ')

  return escaped.length > 0 ? escaped : ''
}

export interface UpstreamQuery {
  /** The Lucene expression, or undefined when there is nothing to constrain. */
  q?: string
  /** Upstream requires a sort when `q` is absent. */
  sort_by?: string
}

/**
 * Builds the upstream query for a directory request.
 *
 * Every clause is combined with AND: filters narrow, they never widen. Within a
 * single dimension the values are OR'd, because picking two brands means
 * "either brand", not "both brands at once", which no product satisfies.
 */
export function buildProductQuery(query: ProductQuery): UpstreamQuery {
  const clauses = [
    freeTextClause(query.q),
    tagClause('categories_tags', query.category),
    tagClause('brands_tags', query.brand),
    tagClause('countries_tags', query.country),
    tagClause('labels_tags', query.label),
    enumClause('nutriscore_grade', query.nutriScore),
    enumClause('nova_groups', query.nova),
  ].filter((clause) => clause.length > 0)

  const sortField = UPSTREAM_SORT_FIELDS[query.sort]

  if (clauses.length === 0) {
    // Nothing to match on. Upstream rejects a request with neither `q` nor
    // `sort_by`, and an unfiltered list has no relevance to rank by anyway, so
    // the empty state browses by popularity.
    return { sort_by: sortField ?? '-popularity_key' }
  }

  return {
    q: clauses.join(' AND '),
    ...(sortField ? { sort_by: sortField } : {}),
  }
}
