import { ofetch } from 'ofetch'

export interface UpstreamRequestOptions {
  timeoutMs?: number
  retries?: number
  signal?: AbortSignal
}

const DEFAULT_TIMEOUT_MS = 8_000
const DEFAULT_RETRIES = 2
const BASE_BACKOFF_MS = 250
const MAX_BACKOFF_MS = 2_000

const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504])

function statusOf(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const candidate = error as { response?: { status?: number }; statusCode?: number }
  return candidate.response?.status ?? candidate.statusCode
}

function isRetryable(error: unknown): boolean {
  const status = statusOf(error)
  if (status === undefined) return true
  return RETRYABLE_STATUSES.has(status)
}

export function backoffDelay(attempt: number, random: () => number = Math.random): number {
  const ceiling = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** attempt)
  return Math.round(random() * ceiling)
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason)
      return
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(signal?.reason)
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export interface UpstreamClient {
  get: <T>(
    path: string,
    query?: Record<string, unknown>,
    options?: UpstreamRequestOptions,
  ) => Promise<T>
}

export function createUpstreamClient(baseURL: string, userAgent: string): UpstreamClient {
  const fetcher = ofetch.create({
    baseURL,
    headers: {
      'User-Agent': userAgent,
      Accept: 'application/json',
    },
    retry: false,
  })

  async function get<T>(
    path: string,
    query?: Record<string, unknown>,
    options: UpstreamRequestOptions = {},
  ): Promise<T> {
    const { timeoutMs = DEFAULT_TIMEOUT_MS, retries = DEFAULT_RETRIES, signal } = options

    let lastError: unknown

    for (let attempt = 0; attempt <= retries; attempt++) {
      const timeoutSignal = AbortSignal.timeout(timeoutMs)
      const attemptSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal

      try {
        return await fetcher<T>(path, { query, signal: attemptSignal })
      } catch (error) {
        lastError = error

        if (signal?.aborted) throw error

        const hasAttemptsLeft = attempt < retries
        if (!hasAttemptsLeft || !isRetryable(error)) throw error

        await sleep(backoffDelay(attempt), signal)
      }
    }

    throw lastError
  }

  return { get }
}

let searchClient: UpstreamClient | undefined
let productClient: UpstreamClient | undefined

export function useSearchClient(): UpstreamClient {
  if (!searchClient) {
    const config = useRuntimeConfig()
    searchClient = createUpstreamClient(
      config.openFoodFacts.searchBase,
      config.openFoodFacts.userAgent,
    )
  }
  return searchClient
}

export function useProductClient(): UpstreamClient {
  if (!productClient) {
    const config = useRuntimeConfig()
    productClient = createUpstreamClient(
      config.openFoodFacts.productBase,
      config.openFoodFacts.userAgent,
    )
  }
  return productClient
}
