import type { ProductCount, ProductQuery } from '#shared/domain/search'
import { buildProductQuery } from '~~/server/utils/lucene'
import type { UpstreamClient } from '~~/server/utils/upstream-client'
import { fetchSearchPage } from './product-search'

export async function countProducts(
  client: UpstreamClient,
  query: ProductQuery,
): Promise<ProductCount> {
  const { response } = await fetchSearchPage(client, {
    ...buildProductQuery(query),
    page: 1,
    page_size: 1,
    fields: 'code',
  })

  return { totalCount: response.count, isTotalExact: response.is_count_exact }
}
