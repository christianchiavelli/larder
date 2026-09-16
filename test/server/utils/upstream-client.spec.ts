import { describe, expect, it } from 'vitest'
import { backoffDelay } from '~~/server/utils/upstream-client'
import { toContractError, toUpstreamError } from '~~/server/utils/upstream-error'
import { z } from 'zod'

const context = { service: 'test-upstream', operation: 'GET /thing' }

/** Shapes an ofetch error the way ofetch actually throws one. */
function fetchError(status: number, headers?: Record<string, string>) {
  const error = new Error(`HTTP ${status}`) as Error & {
    response: { status: number; headers: Headers }
  }
  error.response = { status, headers: new Headers(headers) }
  return error
}

describe('backoffDelay', () => {
  it('grows the ceiling exponentially', () => {
    const atCeiling = () => 1

    expect(backoffDelay(0, atCeiling)).toBe(250)
    expect(backoffDelay(1, atCeiling)).toBe(500)
    expect(backoffDelay(2, atCeiling)).toBe(1000)
  })

  it('caps the ceiling so a long retry chain cannot stall a render', () => {
    expect(backoffDelay(20, () => 1)).toBe(2000)
  })

  /**
   * Full jitter: SSR fires several requests at once, and without it a shared
   * hiccup makes them retry on the same tick.
   */
  it('applies full jitter, so the delay spans zero to the ceiling', () => {
    expect(backoffDelay(1, () => 0)).toBe(0)
    expect(backoffDelay(1, () => 0.5)).toBe(250)
    expect(backoffDelay(1, () => 1)).toBe(500)
  })

  it('never returns a negative delay', () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      expect(backoffDelay(attempt)).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('toUpstreamError', () => {
  it('maps a timeout to 504 rather than a generic failure', () => {
    const abort = new Error('aborted')
    abort.name = 'TimeoutError'

    const error = toUpstreamError(abort, context)

    expect(error.statusCode).toBe(504)
    expect(error.data).toMatchObject({ reason: 'upstream_timeout' })
  })

  it('passes a 404 through, since it is a real answer about a real resource', () => {
    expect(toUpstreamError(fetchError(404), context).statusCode).toBe(404)
  })

  it('preserves a Retry-After header so the client can back off usefully', () => {
    const error = toUpstreamError(fetchError(429, { 'retry-after': '30' }), context)

    expect(error.statusCode).toBe(429)
    expect(error.data).toMatchObject({ reason: 'upstream_rate_limited', retryAfter: '30' })
  })

  it('reports a 429 without the header rather than inventing a delay', () => {
    expect(toUpstreamError(fetchError(429), context).data).toMatchObject({ retryAfter: null })
  })

  /**
   * A 4xx means we built a request upstream rejected, so it surfaces as 500: a 502
   * would point an on-call engineer at a third party during our own incident.
   */
  it('reports a rejected request as our own 500, not as upstream being down', () => {
    expect(toUpstreamError(fetchError(422), context).statusCode).toBe(500)
  })

  it('maps upstream 5xx to 502, which says whose fault it is', () => {
    expect(toUpstreamError(fetchError(503), context).statusCode).toBe(502)
  })

  it('maps a network failure with no status to 502', () => {
    expect(toUpstreamError(new Error('ECONNRESET'), context).statusCode).toBe(502)
  })

  it('never forwards the upstream body, which leaks internal hostnames', () => {
    const error = toUpstreamError(fetchError(503), context)

    expect(JSON.stringify(error.data)).not.toContain('HTTP 503')
  })
})

describe('toContractError', () => {
  it('maps a schema violation to 502, because the response is unusable and not our caller‘s fault', () => {
    const result = z.object({ hits: z.array(z.unknown()) }).safeParse({ hits: 'not a list' })
    const error = toContractError(result.error!, context)

    expect(error.statusCode).toBe(502)
    expect(error.data).toMatchObject({ reason: 'upstream_contract_violation' })
  })
})
