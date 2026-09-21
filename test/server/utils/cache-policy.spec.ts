import { describe, expect, it } from 'vitest'
import { upstreamCache } from '~~/server/utils/cache-policy'

describe('upstreamCache', () => {
  it('bypasses the cache in development and only in development', () => {
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
