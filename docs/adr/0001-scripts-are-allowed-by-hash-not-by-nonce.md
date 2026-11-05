# 1. Scripts are allowed by hash, not by nonce

**Status:** Accepted · **Decided:** 2026-10-07 · **Commit:** `9e9ccc7`

## Context

Every page needs a Content-Security-Policy that lets the app's own scripts run and nothing else. Nuxt writes several scripts inline: the payload, the import map, and the script that sets the theme before the first paint.

The usual answer is a nonce: a random value per response, put on the policy and on every inline `<script>`. It works because nobody can guess the next one.

The front page is served with `swr: 3600` (`nuxt.config.ts`), so one rendered HTML is handed to every reader for an hour. A nonce inside it is a nonce every reader shares, and a shared nonce is not a nonce — it is a constant anyone can read off the page and reuse.

## Decision

Allow inline scripts by the SHA-256 hash of their contents, computed from the rendered HTML as the response goes out (`server/utils/content-security-policy.ts`). The same page always hashes the same, so caching does not weaken the policy.

Scripts with a `src` come under `'self'`, and `application/ld+json` is data that never runs, so neither is hashed.

## Consequences

- A cached page keeps a policy that still means something, which a nonce would not.
- The hashes are computed from whatever the page actually rendered, so a change to an inline script cannot silently fall outside the policy.
- `style-src` stays `'self'`, but `style-src-attr` has to allow `'unsafe-inline'`: Vue writes style bindings into the server-rendered page as attributes. That is a narrow, deliberate weakening, and it is the one place this policy is not strict.
- Every response is scanned for scripts, which is a string walk over HTML already in memory. It is not free, and it is not measurable next to the render it follows.
