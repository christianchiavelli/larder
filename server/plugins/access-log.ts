import { randomUUID } from 'node:crypto'
import {
  accessRecord,
  failureRecord,
  failureStatus,
  isWorthLogging,
  loggedPath,
} from '~~/server/utils/access-log'

/**
 * A line per answer, and an id to find it by afterwards, so a page somebody reported can be
 * looked up instead of guessed at. The id is taken from the request when the caller brought
 * one, so a proxy or a browser that already assigned it keeps the same one all the way down.
 *
 * It hangs off the request rather than off a handler, so nothing is only visible from inside
 * one: a request that never reaches a route, or one whose route throws, still gets a line.
 */
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

  // A failure is reported here rather than by the answer above, because the answer arrives
  // from the route Nuxt renders errors through, under a path of its own and a status of 200.
  // Reported that way a 404 reads as a page that worked; this says which request failed.
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
