import { expect, test } from '@playwright/test'
import { RUNS_LOCALLY, SOURCE_DOWN_BASE_URL } from './support/servers'

// The route the container polls: it answers for this process only, never for the catalogue.
test.describe('the health route', () => {
  test('says it is well, and how long this process has been up', async ({ request }) => {
    const response = await request.get('/api/health')
    const body = await response.json()

    expect(response.status()).toBe(200)
    expect(body).toMatchObject({ status: 'ok' })
    expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0)
  })

  test('is never cached, since a cached answer to "are you alive" is worth nothing', async ({
    request,
  }) => {
    const headers = (await request.get('/api/health')).headers()

    expect(headers['cache-control']).toBe('no-store')
  })
})

test.describe('when the catalogue is unreachable', () => {
  test.skip(!RUNS_LOCALLY, 'needs the local server whose data source is down')
  test.use({ baseURL: SOURCE_DOWN_BASE_URL })

  test('still says it is serving, because that is a different question', async ({ request }) => {
    const response = await request.get('/api/health')

    expect(response.status()).toBe(200)
    expect(await response.json()).toMatchObject({ status: 'ok' })
  })
})
