// Whether this process is serving, and nothing else: it reads no upstream, so a catalogue
// having a bad day is not reported as this server having one.
export default defineEventHandler((event) => {
  // A cached answer to "are you alive" is the one answer never worth having.
  setHeader(event, 'cache-control', 'no-store')

  return {
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
  }
})
