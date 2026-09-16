import { ofetch } from 'ofetch'

/**
 * Every call originates here: upstream identifies callers by User-Agent, which a
 * browser cannot set. Retries distinguish transient from permanent, and the
 * timeout is ours, since a hanging SSR request holds a Nitro worker.
 */

export interface UpstreamRequestOptions {
  /** Abandon the attempt after this long. Applies per attempt, not per call. */
  timeoutMs?: number
  /** Extra attempts after the first. Only transient failures consume them. */
  retries?: number
  signal?: AbortSignal
}

const DEFAULT_TIMEOUT_MS = 8_000
const DEFAULT_RETRIES = 2
const BASE_BACKOFF_MS = 250
const MAX_BACKOFF_MS = 2_000

/** 429 and 5xx can succeed on a second attempt. Nothing else can. */
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504])

function statusOf(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  const candidate = error as { response?: { status?: number }; statusCode?: number }
  return candidate.response?.status ?? candidate.statusCode
}

function isRetryable(error: unknown): boolean {
  const status = statusOf(error)
  // No status at all means the request never completed: DNS, TCP reset,
  // or our own timeout. All worth one more try.
  if (status === undefined) return true
  return RETRYABLE_STATUSES.has(status)
}

/**
 * Full jitter matters more than the exponent: SSR fires several requests in
 * parallel, and without it a shared hiccup makes them all retry on one tick.
 */
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
    // Retry is handled below so that backoff and retryability stay under test.
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
      // A fresh timeout per attempt, linked to the caller's signal so an
      // aborted SSR render does not leave requests running.
      const timeoutSignal = AbortSignal.timeout(timeoutMs)
      const attemptSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal

      try {
        return await fetcher<T>(path, { query, signal: attemptSignal })
      } catch (error) {
        lastError = error

        // The caller gave up. Stop immediately rather than spending retries.
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

/** Search-a-licious, the Elasticsearch-backed search and aggregation service. */
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

/** The v2 REST API, which is the only one that serves a full product record. */
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
