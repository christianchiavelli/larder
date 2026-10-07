import { contentSecurityPolicy, inlineScriptHashes } from '~~/server/utils/content-security-policy'

// Inline scripts are allowed by their hash rather than a nonce. The front page is cached, and
// a nonce handed to every reader of a cached page is no longer a nonce, while a hash holds:
// the same page always hashes the same.
export default defineNitroPlugin((nitroApp) => {
  if (import.meta.dev) return

  nitroApp.hooks.hook('render:response', (response) => {
    const headers = response.headers
    if (typeof response.body !== 'string' || !headers?.['content-type']?.startsWith('text/html'))
      return

    headers['content-security-policy'] = contentSecurityPolicy(inlineScriptHashes(response.body))
    delete headers['x-powered-by']
  })
})
