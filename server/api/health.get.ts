/**
 * Answers whatever asks whether this server is up, and nothing else.
 *
 * It reads no upstream and touches no cache: the question is whether the process is serving,
 * not whether Open Food Facts is answering today. A catalogue that is down is already said
 * on every page, and a health check that went red for it would report somebody else's outage
 * as ours.
 */
export default defineEventHandler((event) => {
  // A cached answer to "are you alive" is the one answer never worth having.
  setHeader(event, 'cache-control', 'no-store')

  return {
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
  }
})
