import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { setTimeout as sleep } from 'node:timers/promises'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { H3Event } from 'h3'
import { pipeResponse, requestSignal } from '~~/server/utils/stream-response'

let server: Server | undefined

async function serve(handler: (event: H3Event) => Promise<void>): Promise<string> {
  server = createServer((req, res) => {
    void handler({ node: { req, res } } as unknown as H3Event)
  })
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve))
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`
}

afterEach(async () => {
  server?.closeAllConnections()
  await new Promise((resolve) => server?.close(resolve) ?? resolve(undefined))
  server = undefined
  vi.restoreAllMocks()
})

async function* rows(count: number) {
  for (let index = 1; index <= count; index++) yield `row ${index}\r\n`
}

describe('pipeResponse', () => {
  it('sends every chunk and then ends the response', async () => {
    const url = await serve((event) => pipeResponse(event, rows(3)))

    const response = await fetch(url)

    expect(await response.text()).toBe('row 1\r\nrow 2\r\nrow 3\r\n')
  })

  it('cuts the connection when the source fails midway, so the file cannot look complete', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    async function* failing() {
      yield 'row 1\r\n'
      throw new Error('the upstream went away on page two')
    }

    const url = await serve((event) => pipeResponse(event, failing()))
    const response = await fetch(url)

    expect(response.status).toBe(200)
    await expect(response.text()).rejects.toThrow()
    await vi.waitFor(() => expect(error).toHaveBeenCalled())
  })

  it('stops pulling from the source once the client has gone', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    let pulled = 0
    let signal: AbortSignal | undefined

    async function* endless() {
      while (true) {
        pulled++
        await sleep(5)
        yield 'x'.repeat(64 * 1024)
      }
    }

    const url = await serve((event) => {
      signal = requestSignal(event)
      return pipeResponse(event, endless())
    })

    const client = new AbortController()
    const response = await fetch(url, { signal: client.signal })
    await response.body!.getReader().read()
    client.abort()

    await vi.waitFor(() => expect(signal?.aborted).toBe(true))
    const settled = pulled
    await sleep(100)

    expect(pulled).toBe(settled)
    expect(error).not.toHaveBeenCalled()
  })
})

describe('requestSignal', () => {
  it('stays quiet while the response is being written', async () => {
    let seen: boolean | undefined

    const url = await serve(async (event) => {
      const signal = requestSignal(event)
      seen = signal.aborted
      await pipeResponse(event, rows(1))
    })

    await (await fetch(url)).text()

    expect(seen).toBe(false)
  })
})
