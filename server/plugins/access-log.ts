import { randomUUID } from 'node:crypto'
import {
  accessRecord,
  failureRecord,
  failureStatus,
  isWorthLogging,
  loggedPath,
} from '~~/server/utils/access-log'

// A line per answer, with an id a reader can quote back. It hangs off the request rather than
// a handler, so a request that never reaches a route still gets one.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    const requestId = getRequestHeader(event, 'x-request-id') || randomUUID()
    event.context.requestId = requestId
    event.context.startedAt = performance.now()
    setResponseHeader(event, 'x-request-id', requestId)
  })

  nitroApp.hooks.hook('afterResponse', (event) => {
    const requestId = event.context.requestId as string | undefined
    const startedAt = event.context.startedAt as number | undefined
    const path = loggedPath(event.path)

    if (requestId === undefined || startedAt === undefined || !isWorthLogging(path)) return

    console.log(
      accessRecord({
        requestId,
        method: event.method,
        path,
        status: event.node.res.statusCode,
        durationMs: performance.now() - startedAt,
      }),
    )
  })

  // Reported here, not above: the answer arrives from the route Nuxt renders errors through,
  // under a path of its own and a status of 200, which would read a 404 as a page that worked.
  nitroApp.hooks.hook('error', (error, { event }) => {
    if (!event) return

    const requestId = event.context.requestId as string | undefined
    const path = loggedPath(event.path)

    if (requestId === undefined || !isWorthLogging(path)) return

    console.log(
      failureRecord({
        requestId,
        method: event.method,
        path,
        status: failureStatus(error),
      }),
    )
  })
})
