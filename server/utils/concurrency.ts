import { createError, setResponseHeader, type H3Event } from 'h3'

export interface ConcurrencyLimitOptions {
  limit: number
  retryAfterSeconds: number
}

export function concurrencyLimit({ limit, retryAfterSeconds }: ConcurrencyLimitOptions) {
  let running = 0

  return async function run<T>(event: H3Event, work: () => Promise<T>): Promise<T> {
    if (running >= limit) {
      setResponseHeader(event, 'retry-after', retryAfterSeconds)
      throw createError({
        statusCode: 503,
        statusMessage: 'The server is at capacity. Try again shortly.',
        data: { reason: 'at_capacity', retryAfter: retryAfterSeconds },
      })
    }

    running++
    try {
      return await work()
    } finally {
      running--
    }
  }
}
