import type { ProductQuery } from '#shared/domain/search'
import { UPSTREAM_SORT_FIELDS } from '#shared/domain/search'
import { NOVA_UNGROUPED } from '#shared/domain/nutrition'

const LUCENE_SPECIAL = /[+\-&|!(){}[\]^"~*?:\\/]/g

export function escapeLuceneTerm(input: string): string {
  return input.replace(LUCENE_SPECIAL, (char) => `\\${char}`)
}

export function quoteLuceneValue(value: string): string {
  return `"${value.replace(/[\\"]/g, (char) => `\\${char}`)}"`
}

function tagClause(field: string, values: readonly string[]): string {
  if (values.length === 0) return ''
  const terms = values.map((value) => `${field}:${quoteLuceneValue(value)}`)
  return terms.length === 1 ? terms[0]! : `(${terms.join(' OR ')})`
}

function enumClause(field: string, values: readonly (string | number)[]): string {
  if (values.length === 0) return ''
  const terms = values.map((value) => `${field}:${quoteLuceneValue(String(value))}`)
  return terms.length === 1 ? terms[0]! : `(${terms.join(' OR ')})`
}

function novaClause(values: readonly (string | number)[]): string {
  if (values.length === 0) return ''

  const terms = values.map((value) =>
    value === NOVA_UNGROUPED
      ? '(NOT nova_groups:*)'
      : `nova_groups:${quoteLuceneValue(String(value))}`,
  )

  return terms.length === 1 ? terms[0]! : `(${terms.join(' OR ')})`
}

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
  sort_by?: string
}

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
    return { sort_by: sortField ?? '-popularity_key' }
  }

  return {
    q: clauses.join(' AND '),
    ...(sortField ? { sort_by: sortField } : {}),
  }
}
