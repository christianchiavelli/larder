import { createError, type H3Error } from 'h3'
import type { ZodError } from 'zod'

/**
 * Translates upstream failures into statuses that mean something to our client.
 *
 * The distinction that matters here is between "upstream said no" and "upstream
 * misbehaved". Forwarding a raw 500 would tell the browser our API is broken,
 * when in fact a third party is; 502 and 504 say that accurately and let the
 * client decide whether retrying is worth it.
 */

export interface UpstreamFailureContext {
  /** Which upstream service, for logs. Never surfaced to the client. */
  service: string
  /** Path or operation attempted, for logs. */
  operation: string
}

type FetchLikeError = Error & {
  statusCode?: number
  status?: number
  response?: { status?: number; headers?: Headers }
  cause?: unknown
}

function statusOf(error: FetchLikeError): number | undefined {
  return error.response?.status ?? error.statusCode ?? error.status
}

function isAbort(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const name = (error as { name?: string }).name
  return name === 'AbortError' || name === 'TimeoutError'
}

/**
 * Maps a thrown fetch error to an H3 error.
 *
 * `data.reason` is a stable machine-readable code the client switches on;
 * `statusMessage` is prose for a human reading a log or a network tab. Upstream
 * response bodies are deliberately not forwarded: they leak internal hostnames
 * and are not written for our users.
 */
export function toUpstreamError(error: unknown, context: UpstreamFailureContext): H3Error {
  if (isAbort(error)) {
    return createError({
      statusCode: 504,
      statusMessage: 'The data source did not respond in time.',
      data: { reason: 'upstream_timeout' },
    })
  }

  const status = statusOf(error as FetchLikeError)

  if (status === 404) {
    return createError({
      statusCode: 404,
      statusMessage: 'Not found.',
      data: { reason: 'not_found' },
    })
  }

  if (status === 429) {
    const retryAfter = (error as FetchLikeError).response?.headers?.get('retry-after')
    return createError({
      statusCode: 429,
      statusMessage: 'The data source is rate limiting requests. Try again shortly.',
      data: { reason: 'upstream_rate_limited', retryAfter: retryAfter ?? null },
    })
  }

  if (status !== undefined && status >= 400 && status < 500) {
    // We built a request upstream rejected. That is our bug, and a 502 would
    // point the finger in the wrong direction during an incident.
    console.error(`[${context.service}] rejected request for ${context.operation}`, { status })
    return createError({
      statusCode: 500,
      statusMessage: 'The request could not be completed.',
      data: { reason: 'bad_upstream_request' },
    })
  }

  console.error(`[${context.service}] failed for ${context.operation}`, error)

  return createError({
    statusCode: 502,
    statusMessage: 'The data source is unavailable.',
    data: { reason: 'upstream_unavailable' },
  })
}

/**
 * Raised when upstream answers 200 with a body that does not match its own
 * contract. That is a 502: the response is unusable, and it is not the caller's
 * fault. The Zod issue paths go to the log so the schema can be fixed, because
 * upstream shapes drift without announcement.
 */
export function toContractError(error: ZodError, context: UpstreamFailureContext): H3Error {
  console.error(`[${context.service}] contract violation on ${context.operation}`, {
    issues: error.issues.slice(0, 10).map((issue) => ({
      path: issue.path.join('.'),
      code: issue.code,
      message: issue.message,
    })),
    totalIssues: error.issues.length,
  })

  return createError({
    statusCode: 502,
    statusMessage: 'The data source returned an unexpected response.',
    data: { reason: 'upstream_contract_violation' },
  })
}
