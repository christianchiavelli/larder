import type { ProductQuery } from '#shared/domain/search'
import { UPSTREAM_SORT_FIELDS } from '#shared/domain/search'
import { NOVA_UNGROUPED } from '#shared/domain/nutrition'

/**
 * Upstream parses `q` as Lucene, so the SQL rule applies: structure is ours,
 * values are always escaped. Unescaped input does not error, it reinterprets
 * the query and returns zero matches.
 */

// `&` and `|` because the operators are `&&` and `||`.
const LUCENE_SPECIAL = /[+\-&|!(){}[\]^"~*?:\\/]/g

export function escapeLuceneTerm(input: string): string {
  return input.replace(LUCENE_SPECIAL, (char) => `\\${char}`)
}

/** Taxonomy ids carry a colon, which is also the field separator. */
export function quoteLuceneValue(value: string): string {
  return `"${value.replace(/[\\"]/g, (char) => `\\${char}`)}"`
}

function tagClause(field: string, values: readonly string[]): string {
  if (values.length === 0) return ''
  const terms = values.map((value) => `${field}:${quoteLuceneValue(value)}`)
  return terms.length === 1 ? terms[0]! : `(${terms.join(' OR ')})`
}

/**
 * Quoted, not escaped. The escaper treats `-` as the NOT operator, which it is
 * only at the start of a term, and `nutriscore_grade:not\-applicable` matches
 * nothing.
 */
function enumClause(field: string, values: readonly (string | number)[]): string {
  if (values.length === 0) return ''
  const terms = values.map((value) => `${field}:${quoteLuceneValue(String(value))}`)
  return terms.length === 1 ? terms[0]! : `(${terms.join(' OR ')})`
}

/**
 * A missing NOVA group is an absent field rather than a value, so it has no
 * bucket to select and takes a negation. Upstream agrees the two are disjoint:
 * among balsamic vinegars, group 2 gives 1,483, the absence 71, together 1,554.
 */
function novaClause(values: readonly (string | number)[]): string {
  if (values.length === 0) return ''

  const terms = values.map((value) =>
    value === NOVA_UNGROUPED
      ? '(NOT nova_groups:*)'
      : `nova_groups:${quoteLuceneValue(String(value))}`,
  )

  return terms.length === 1 ? terms[0]! : `(${terms.join(' OR ')})`
}

/**
 * Escaped but unquoted, so upstream still tokenises it. Quoting would make
 * "dark chocolate" a phrase and drop every "chocolate, dark".
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
  q?: string
  /** Upstream requires a sort when `q` is absent. */
  sort_by?: string
}

/** AND across dimensions, OR within one: two brands means either, not both. */
export function buildProductQuery(query: ProductQuery): UpstreamQuery {
  const clauses = [
    freeTextClause(query.q),
    tagClause('categories_tags', query.category),
    tagClause('brands_tags', query.brand),
    tagClause('countries_tags', query.country),
    tagClause('labels_tags', query.label),
    enumClause('nutriscore_grade', query.nutriScore),
    novaClause(query.nova),
  ].filter((clause) => clause.length > 0)

  const sortField = UPSTREAM_SORT_FIELDS[query.sort]

  if (clauses.length === 0) {
    // Upstream rejects a request with neither `q` nor `sort_by`.
    return { sort_by: sortField ?? '-popularity_key' }
  }

  return {
    q: clauses.join(' AND '),
    ...(sortField ? { sort_by: sortField } : {}),
  }
}
