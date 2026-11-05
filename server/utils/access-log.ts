/**
 * Lines for whatever ends up reading the server's log.
 *
 * The query string is left out on purpose: on the pages that matter it is the reader's own
 * search terms, and a log is not the place to keep those.
 */

/**
 * The build's own files, and the route Nuxt renders a failure through: most of the traffic,
 * and none of it a reader asked for. `/__nuxt_error` goes here because a request that failed
 * is reported by `failureRecord` with the path that actually failed — leaving it in would
 * report the failure twice, once under a made-up route and a status of 200.
 */
const QUIET_PREFIXES = ['/_nuxt/', '/_fonts/', '/favicon', '/__nuxt_error'] as const

export function isWorthLogging(path: string): boolean {
  return !QUIET_PREFIXES.some((prefix) => path.startsWith(prefix))
}

/** The path alone, without the query and without a trailing slash that would split one route in two. */
export function loggedPath(url: string): string {
  const query = url.indexOf('?')
  const path = query === -1 ? url : url.slice(0, query)

  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path
}

export interface AccessRecord {
  requestId: string
  method: string
  path: string
  status: number
  durationMs: number
}

export type FailureRecord = Omit<AccessRecord, 'durationMs'>

export function accessRecord(input: AccessRecord): string {
  return JSON.stringify({
    level: 'info',
    msg: 'request',
    requestId: input.requestId,
    method: input.method,
    path: input.path,
    status: input.status,
    durationMs: Math.round(input.durationMs),
  })
}

export function failureRecord(input: FailureRecord): string {
  return JSON.stringify({
    level: 'error',
    msg: 'request-failed',
    requestId: input.requestId,
    method: input.method,
    path: input.path,
    status: input.status,
  })
}

/** The status a failure should be read as, wherever the throw put it. */
export function failureStatus(error: unknown): number {
  const candidate = error as {
    statusCode?: number
    status?: number
    response?: { status?: number }
  } | null

  return candidate?.statusCode ?? candidate?.status ?? candidate?.response?.status ?? 500
}
