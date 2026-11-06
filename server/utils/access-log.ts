// Not worth a line: the build's own files, the route a failure is rendered through (reported
// by `failureRecord` with the path that failed), and the health route the container polls.
const QUIET_PREFIXES = ['/_nuxt/', '/_fonts/', '/favicon', '/__nuxt_error', '/api/health'] as const

export function isWorthLogging(path: string): boolean {
  return !QUIET_PREFIXES.some((prefix) => path.startsWith(prefix))
}

/** The path alone: the query is the reader's own search terms, and a trailing slash would split one route in two. */
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
