import { createError } from 'h3'
import { exportVerdict } from '#shared/domain/export'
import { NUTRIENTS, NUTRIENT_KEYS } from '#shared/domain/nutrition'
import type { ProductSummary } from '#shared/domain/product'
import { MAX_TRACKED_HITS, maxPageFor, type ProductQuery } from '#shared/domain/search'
import { mostSpecificTag } from '#shared/domain/taxonomy'
import { productSourceUrl } from '~~/server/upstream/product'
import { SUMMARY_FIELDS } from '~~/server/upstream/search'
import { CSV_BYTE_ORDER_MARK, csvRecord, type CsvValue } from '~~/server/utils/csv'
import { buildProductQuery } from '~~/server/utils/lucene'
import type { UpstreamClient } from '~~/server/utils/upstream-client'
import { fetchSearchPage, type SearchPage } from './product-search'

export const EXPORT_PAGE_SIZE = 1_000

const LAST_PAGE = maxPageFor(EXPORT_PAGE_SIZE)

const EXPORT_FIELDS = SUMMARY_FIELDS.join(',')

interface ExportColumn {
  header: string
  value: (product: ProductSummary) => CsvValue
}

function exportColumns(productBase: string): readonly ExportColumn[] {
  return [
    { header: 'Barcode', value: (product) => product.code },
    { header: 'Name', value: (product) => product.name || null },
    { header: 'Brands', value: (product) => product.brands.join(', ') || null },
    { header: 'Category', value: (product) => mostSpecificTag(product.categories)?.label ?? null },
    {
      header: 'Nutri-Score',
      value: (product) => (product.nutriScore === 'unknown' ? null : product.nutriScore),
    },
    { header: 'NOVA group', value: (product) => product.novaGroup },
    ...NUTRIENT_KEYS.map((key): ExportColumn => ({
      header: `${NUTRIENTS[key].label} (${NUTRIENTS[key].unit}/100 g)`,
      value: (product) => product.nutrients[key],
    })),
    { header: 'Source', value: (product) => productSourceUrl(productBase, product.code) },
  ]
}

function isFull(page: SearchPage): boolean {
  return page.response.hits.length === EXPORT_PAGE_SIZE
}

export interface ProductExportOptions {
  productBase: string
  signal?: AbortSignal
}

export async function openProductExport(
  client: UpstreamClient,
  query: ProductQuery,
  { productBase, signal }: ProductExportOptions,
): Promise<AsyncGenerator<string, void>> {
  const upstreamQuery = buildProductQuery(query)
  const columns = exportColumns(productBase)

  const fetchPage = (page: number) =>
    fetchSearchPage(
      client,
      { ...upstreamQuery, page, page_size: EXPORT_PAGE_SIZE, fields: EXPORT_FIELDS },
      { signal },
    )

  const toRecords = (items: readonly ProductSummary[]) =>
    items.map((product) => csvRecord(columns.map((column) => column.value(product)))).join('')

  const first = await fetchPage(1)

  const verdict = exportVerdict({
    totalCount: first.response.count,
    isTotalExact: first.response.is_count_exact,
  })

  if (verdict === 'too-many') {
    throw createError({
      statusCode: 422,
      statusMessage: 'The search matches more products than one export holds. Narrow it first.',
      data: { reason: 'too_many_results', limit: MAX_TRACKED_HITS },
    })
  }

  async function* chunks() {
    const header = csvRecord(columns.map((column) => column.header))
    yield CSV_BYTE_ORDER_MARK + header + toRecords(first.items)

    let last = first
    for (let page = 2; page <= LAST_PAGE && isFull(last); page++) {
      last = await fetchPage(page)
      yield toRecords(last.items)
    }
  }

  return chunks()
}
