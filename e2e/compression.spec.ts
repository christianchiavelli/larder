import { expect, test } from '@playwright/test'

// What a browser asks for: pages and answers are packed as they go out, the scripts and styles
// were packed by the build.
const BROWSER = { 'accept-encoding': 'gzip, deflate, br, zstd' }

test.describe('compression', () => {
  for (const path of ['/', '/pt/products', '/api/products?nutriScore=a']) {
    test(`sends ${path} in brotli`, async ({ request }) => {
      const response = await request.get(path, { headers: BROWSER })

      expect(response.ok(), `${path} answered ${response.status()}`).toBe(true)
      expect(response.headers()['content-encoding']).toBe('br')
      expect(response.headers()['vary']).toContain('Accept-Encoding')
    })
  }

  test('sends the built styles in brotli too', async ({ request }) => {
    const page = await request.get('/', { headers: BROWSER })
    const stylesheet = (await page.text()).match(/\/_nuxt\/[\w.-]+\.css/)?.[0]
    expect(stylesheet, 'the front page links no stylesheet').toBeDefined()

    const response = await request.get(stylesheet!, { headers: BROWSER })

    expect(response.headers()['content-encoding']).toBe('br')
  })
})
