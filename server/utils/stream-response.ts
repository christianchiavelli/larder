import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { H3Event } from 'h3'

export function requestSignal(event: H3Event): AbortSignal {
  const controller = new AbortController()
  event.node.res.once('close', () => controller.abort())
  return controller.signal
}

function isClientDeparture(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | null)?.code === 'ERR_STREAM_PREMATURE_CLOSE'
}

export async function pipeResponse(event: H3Event, chunks: AsyncIterable<string>): Promise<void> {
  try {
    await pipeline(Readable.from(chunks, { objectMode: false }), event.node.res)
  } catch (error) {
    if (!isClientDeparture(error)) {
      console.error('[stream] response cut short after it was committed', error)
    }
  }
}
