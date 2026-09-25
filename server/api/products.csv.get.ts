import { defineEventHandler, getQuery, setResponseHeaders } from 'h3'
import { productQuerySchema } from '#shared/domain/search'
import { openProductExport } from '~~/server/services/product-export'
import { concurrencyLimit } from '~~/server/utils/concurrency'
import { pipeResponse, requestSignal } from '~~/server/utils/stream-response'
import { useSearchClient } from '~~/server/utils/upstream-client'

let exportSlot: ReturnType<typeof concurrencyLimit> | undefined

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  exportSlot ??= concurrencyLimit({ limit: config.exportConcurrency, retryAfterSeconds: 30 })

  return exportSlot(event, async () => {
    const query = productQuerySchema.parse(getQuery(event))

    const csv = await openProductExport(useSearchClient(), query, {
      productBase: config.openFoodFacts.productBase,
      signal: requestSignal(event),
    })

    setResponseHeaders(event, {
      'content-type': 'text/csv; charset=utf-8; header=present',
      'content-disposition': 'attachment; filename="larder-products.csv"',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    })

    await pipeResponse(event, csv)
  })
})
