import { expect, test, type APIRequestContext } from '@playwright/test'

/**
 * Every filter the UI offers, applied, checked for a result.
 *
 * It exists for a bug with no error and no log: the brands facet stores a bare
 * slug, autocomplete prefixes everything, and a suggested brand applied a
 * filter the index does not use. No type system or unit test sees a
 * disagreement between two upstream services about a vocabulary, so this walks
 * the same path a reader does.
 *
 * Presence only, never counts: upstream is community-edited and the numbers
 * move daily.
 */

const DIMENSIONS = [
  { filter: 'category', facet: 'categories_tags' },
  { filter: 'brand', facet: 'brands_tags' },
  { filter: 'country', facet: 'countries_tags' },
  { filter: 'label', facet: 'labels_tags' },
] as const

/** Enough of each facet's top values to catch a whole-dimension break. */
const SAMPLE = 3

async function json(request: APIRequestContext, url: string) {
  const response = await request.get(url)
  expect(response.ok(), `${url} answered ${response.status()}`).toBe(true)
  return response.json()
}

test.describe('filters round-trip', () => {
  for (const { filter, facet } of DIMENSIONS) {
    test(`every ${filter} the sidebar offers returns products`, async ({ request }) => {
      const directory = await json(request, '/api/products')
      const values = (directory.facets[facet] ?? []).slice(0, SAMPLE)

      // An empty facet is itself the failure: nothing to click in the sidebar.
      expect(values.length, `the ${facet} facet came back empty`).toBeGreaterThan(0)

      for (const value of values) {
        const result = await json(
          request,
          `/api/products?${filter}=${encodeURIComponent(value.key)}`,
        )
        expect(result.totalCount, `${filter}=${value.key} matched nothing`).toBeGreaterThan(0)
      }
    })
  }

  test('a suggested category applies to something', async ({ request }) => {
    const suggestions = await json(request, '/api/suggest?q=choc&taxonomy=category&limit=3')
    expect(suggestions.length).toBeGreaterThan(0)

    for (const suggestion of suggestions) {
      const result = await json(
        request,
        `/api/products?category=${encodeURIComponent(suggestion.id)}`,
      )
      expect(result.totalCount, `category=${suggestion.id} matched nothing`).toBeGreaterThan(0)
    }
  })

  /**
   * One known-good value rather than every suggestion: autocomplete answers
   * from the taxonomy, a superset of what is indexed, so some suggestions
   * legitimately match nothing. What must hold is that the vocabularies agree.
   */
  test('a suggested brand reaches the products under it', async ({ request }) => {
    const suggestions = await json(request, '/api/suggest?q=nestle&taxonomy=brand&limit=5')
    expect(suggestions.length).toBeGreaterThan(0)

    const counts = await Promise.all(
      suggestions.map(async (suggestion: { id: string }) => {
        const result = await json(
          request,
          `/api/products?brand=${encodeURIComponent(suggestion.id)}`,
        )
        return result.totalCount as number
      }),
    )

    expect(Math.max(...counts), 'no suggested brand matched any product').toBeGreaterThan(0)
  })

  test.describe('grades and groups return what was asked for', () => {
    for (const grade of ['a', 'b', 'c', 'd', 'e', 'unknown', 'not-applicable']) {
      test(`nutriScore=${grade}`, async ({ request }) => {
        const result = await json(request, `/api/products?nutriScore=${grade}`)

        expect(result.totalCount).toBeGreaterThan(0)
        expect(
          result.items.map((item: { nutriScore: string }) => item.nutriScore),
          `a row came back that is not grade ${grade}`,
        ).toEqual(result.items.map(() => grade))
      })
    }

    // `none` is not a value in the index, so it breaks if upstream stops
    // accepting the negation that selects it.
    for (const group of [1, 2, 3, 4, 'none']) {
      test(`nova=${group}`, async ({ request }) => {
        const result = await json(request, `/api/products?nova=${group}`)
        const expected = group === 'none' ? null : group

        expect(result.totalCount).toBeGreaterThan(0)
        expect(
          result.items.map((item: { novaGroup: number | null }) => item.novaGroup),
          `a row came back that is not NOVA ${group}`,
        ).toEqual(result.items.map(() => expected))
      })
    }
  })

  test('each sort is a different list once there is something to rank', async ({ request }) => {
    // With no term, relevance falls back to popularity upstream.
    const codes = async (sort: string) => {
      const result = await json(request, `/api/products?q=chocolate&sort=${sort}`)
      return result.items.map((item: { code: string }) => item.code).join(',')
    }

    const [relevance, popularity, nutriscore] = await Promise.all([
      codes('relevance'),
      codes('popularity'),
      codes('nutriscore'),
    ])

    expect(relevance).not.toBe(popularity)
    expect(relevance).not.toBe(nutriscore)
    expect(popularity).not.toBe(nutriscore)
  })

  test('paging moves through the set without repeating a product', async ({ request }) => {
    const page = async (n: number) => {
      const result = await json(request, `/api/products?page=${n}`)
      return new Set<string>(result.items.map((item: { code: string }) => item.code))
    }

    const [first, second] = await Promise.all([page(1), page(2)])
    const repeated = [...first].filter((code) => second.has(code))

    expect(first.size).toBeGreaterThan(0)
    expect(repeated, 'page two repeated a product from page one').toEqual([])
  })
})
