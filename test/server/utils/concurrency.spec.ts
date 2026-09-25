import { describe, expect, it, vi } from 'vitest'
import type { H3Event } from 'h3'
import { concurrencyLimit } from '~~/server/utils/concurrency'

function fakeEvent() {
  const setHeader = vi.fn()
  return { event: { node: { res: { setHeader } } } as unknown as H3Event, setHeader }
}

function deferred() {
  let settle!: (outcome: 'done' | Error) => void
  const promise = new Promise<string>((resolve, reject) => {
    settle = (outcome) => (outcome instanceof Error ? reject(outcome) : resolve(outcome))
  })
  return { work: () => promise, settle }
}

describe('concurrencyLimit', () => {
  it('runs work side by side up to the limit', async () => {
    const run = concurrencyLimit({ limit: 2, retryAfterSeconds: 30 })
    const first = deferred()
    const second = deferred()

    const running = [run(fakeEvent().event, first.work), run(fakeEvent().event, second.work)]
    first.settle('done')
    second.settle('done')

    await expect(Promise.all(running)).resolves.toEqual(['done', 'done'])
  })

  it('turns the next one away with a 503 that says when to come back', async () => {
    const run = concurrencyLimit({ limit: 1, retryAfterSeconds: 30 })
    const busy = deferred()
    const refused = fakeEvent()
    const work = vi.fn()

    const running = run(fakeEvent().event, busy.work)

    await expect(run(refused.event, work)).rejects.toMatchObject({
      statusCode: 503,
      data: { reason: 'at_capacity', retryAfter: 30 },
    })
    expect(refused.setHeader).toHaveBeenCalledWith('retry-after', 30)
    expect(work).not.toHaveBeenCalled()

    busy.settle('done')
    await running
  })

  it('gives the slot back when the work fails as well as when it succeeds', async () => {
    const run = concurrencyLimit({ limit: 1, retryAfterSeconds: 30 })

    await expect(
      run(fakeEvent().event, () => Promise.reject(new Error('upstream down'))),
    ).rejects.toThrow('upstream down')
    await expect(run(fakeEvent().event, () => Promise.resolve('next'))).resolves.toBe('next')
  })
})
