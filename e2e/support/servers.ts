export const PORT = Number(process.env.E2E_PORT ?? 3210)
export const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`
export const RUNS_LOCALLY = !process.env.E2E_BASE_URL

export const FAILING_UPSTREAM_PORT = PORT + 1
export const SOURCE_DOWN_PORT = PORT + 2
export const SOURCE_DOWN_BASE_URL = `http://localhost:${SOURCE_DOWN_PORT}`
