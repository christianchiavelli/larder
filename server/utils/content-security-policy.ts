import { createHash } from 'node:crypto'

const SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi
const HAS_SOURCE = /(?:^|\s)src=/i
const IS_DATA = /(?:^|\s)type=["']?application\/(?:ld\+)?json\b/i

/**
 * The hash of every script a page runs inline, its import map included. A script with a
 * source comes under 'self', and JSON is data that never runs.
 */
export function inlineScriptHashes(html: string): string[] {
  const hashes = new Set<string>()

  for (const [, attributes = '', body = ''] of html.matchAll(SCRIPT)) {
    if (!body || HAS_SOURCE.test(attributes) || IS_DATA.test(attributes)) continue
    hashes.add(`'sha256-${createHash('sha256').update(body).digest('base64')}'`)
  }

  return [...hashes]
}

export function contentSecurityPolicy(
  scriptHashes: readonly string[],
  imageOrigin: string,
): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", ...scriptHashes],
    'style-src': ["'self'"],
    // Vue writes style bindings into the server-rendered page as attributes.
    'style-src-attr': ["'unsafe-inline'"],
    'img-src': ["'self'", imageOrigin],
    'object-src': ["'none'"],
    'base-uri': ["'none'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  }

  return Object.entries(directives)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ')
}
