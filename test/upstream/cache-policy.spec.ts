import { describe, expect, it } from 'vitest'
import { upstreamCache } from '~~/server/utils/cache-policy'

/**
 * The shared cache policy.
 *
 * Small enough to look self-evident, and it holds one invariant that is only
 * ever noticed when it is missing: every upstream route bypasses the cache in
 * development. Without it, a cached response outlives the code that produced
 * it, so editing a mapper appears to do nothing and the obvious conclusion is
 * the wrong one.
 */

describe('upstreamCache', () => {
  it('bypasses the cache in development and only in development', () => {
    // Asserted against the flag rather than against a literal, because the
    // point is that the two always agree.
    expect(upstreamCache({ name: 'x', maxAge: 60 }).shouldBypassCache?.({} as never)).toBe(
      import.meta.dev,
    )
  })

  it('serves stale while revalidating by default', () => {
    expect(upstreamCache({ name: 'x', maxAge: 60 }).swr).toBe(true)
  })

  it('lets a route opt out of stale-while-revalidate', () => {
    expect(upstreamCache({ name: 'x', maxAge: 60, swr: false }).swr).toBe(false)
  })

  it('keeps the bypass even when a route passes its own', () => {
    // The whole reason the policy is centralised: a route cannot switch the
    // development bypass off, by accident or otherwise.
    const policy = upstreamCache({
      name: 'x',
      maxAge: 60,
      shouldBypassCache: () => false,
    })

    expect(policy.shouldBypassCache?.({} as never)).toBe(import.meta.dev)
  })

  it('passes the name and maxAge through', () => {
    const policy = upstreamCache({ name: 'products', maxAge: 3600 })

    expect(policy.name).toBe('products')
    expect(policy.maxAge).toBe(3600)
  })
})
