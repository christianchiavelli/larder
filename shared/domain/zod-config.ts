import { config } from 'zod'

// Zod compiles faster parsers with `new Function`, and finds out whether it may as it builds
// its first object schema, by calling it once: under the Content-Security-Policy a browser
// refuses that and reports it. The domain modules build their schemas as they load, before
// any plugin could step in, so each imports this first and the browser is told not to try.
if (import.meta.client) config({ jitless: true })
