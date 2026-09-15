import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { LocationQuery } from 'vue-router'

/**
 * The filter state, which lives in the URL and nowhere else.
 *
 * Every rule in this composable is one a user notices only when it is wrong:
 * landing on an empty page 8, a checkbox that will not switch off, a cleared
 * filter panel that also silently reset the sort. The end-to-end suite drives a
 * few of these through a browser, but the matrix of dimensions and toggles is
 * combinatorial and belongs here, where each case costs a millisecond.
 */

const currentQuery = ref<LocationQuery>({})
const push = vi.fn((to: { query: LocationQuery }) => {
  currentQuery.value = to.query
  return Promise.resolve()
})

/**
 * The router is replaced wholesale, because the point of this composable is
 * what it writes to the URL, and a real router would answer that question with
 * a navigation.
 *
 * No Nuxt runtime either, which is why the composable imports `computed` from
 * Vue rather than relying on the auto-import: a module that can only be loaded
 * inside a framework runtime can only be tested inside one too, and that is a
 * second or two per file for nothing.
 */
vi.mock('vue-router', () => ({
  useRoute: () => ({
    get query() {
      return currentQuery.value
    },
  }),
  useRouter: () => ({ push }),
}))

const { useProductQuery } = await import('~/composables/use-product-query')

beforeEach(() => {
  currentQuery.value = {}
  push.mockClear()
})

/** The query object the last `router.push` wrote. */
function lastPush(): LocationQuery {
  const call = push.mock.calls.at(-1)
  if (!call) throw new Error('nothing was pushed')
  return call[0].query
}

describe('useProductQuery', () => {
  it('reads the query out of the URL rather than holding a copy', () => {
    currentQuery.value = { q: 'cocoa', nutriScore: ['a', 'b'], page: '3' }

    const { query } = useProductQuery()

    expect(query.value.q).toBe('cocoa')
    expect(query.value.nutriScore).toEqual(['a', 'b'])
    expect(query.value.page).toBe(3)
  })

  it('omits defaults from the URL it writes', () => {
    const { setSearchTerm } = useProductQuery()

    setSearchTerm('cocoa')

    // A URL carrying every default is a URL nobody can read, and it makes two
    // identical searches look like different ones in a cache key or a bookmark.
    expect(lastPush()).toEqual({ q: 'cocoa' })
  })

  describe('the page number', () => {
    /**
     * The rule worth the most here. Narrowing a result set while holding the
     * page number lands the user on an empty page of a set that now has three,
     * and the reasonable conclusion is that the filter is broken.
     */
    it('resets when a filter changes', () => {
      currentQuery.value = { page: '8' }
      const { toggleNutriScore } = useProductQuery()

      toggleNutriScore('a')

      expect(lastPush().page).toBeUndefined()
    })

    it('resets when the search term changes', () => {
      currentQuery.value = { page: '8' }
      const { setSearchTerm } = useProductQuery()

      setSearchTerm('cocoa')

      expect(lastPush().page).toBeUndefined()
    })

    it('resets when the page size changes', () => {
      currentQuery.value = { page: '8' }
      const { setPageSize } = useProductQuery()

      setPageSize(48)

      expect(lastPush().page).toBeUndefined()
    })

    // Sort is a preference, not a filter: it reorders the same set rather than
    // shrinking it, so the page the user is on still exists.
    it('survives a sort change', () => {
      currentQuery.value = { page: '8' }
      const { setSort } = useProductQuery()

      setSort('popularity')

      expect(lastPush().page).toBe('8')
      expect(lastPush().sort).toBe('popularity')
    })

    it('survives an explicit page change', () => {
      const { setPage } = useProductQuery()

      setPage(4)

      expect(lastPush().page).toBe('4')
    })
  })

  describe('toggling', () => {
    it.each(['category', 'brand', 'country', 'label'] as const)('adds a %s', (dimension) => {
      const { toggleTag } = useProductQuery()

      toggleTag(dimension, 'en:snacks')

      expect(lastPush()[dimension]).toEqual(['en:snacks'])
    })

    it.each(['category', 'brand', 'country', 'label'] as const)(
      'removes a %s that is already applied',
      (dimension) => {
        currentQuery.value = { [dimension]: ['en:snacks', 'en:drinks'] }
        const { toggleTag } = useProductQuery()

        toggleTag(dimension, 'en:snacks')

        expect(lastPush()[dimension]).toEqual(['en:drinks'])
      },
    )

    it('drops the parameter entirely once the last value is removed', () => {
      currentQuery.value = { category: ['en:snacks'] }
      const { toggleTag } = useProductQuery()

      toggleTag('category', 'en:snacks')

      // The bug this file was written for: `toQueryParams` omits an empty list,
      // so a patch that empties one used to leave the previous value in place
      // and the filter could not be switched off at all.
      expect(lastPush().category).toBeUndefined()
    })

    it('toggles a Nutri-Score grade', () => {
      currentQuery.value = { nutriScore: ['a', 'c'] }
      const { toggleNutriScore } = useProductQuery()

      toggleNutriScore('c')

      expect(lastPush().nutriScore).toEqual(['a'])
    })

    it('toggles a NOVA group', () => {
      currentQuery.value = { nova: ['1', '4'] }
      const { toggleNova } = useProductQuery()

      toggleNova(2)

      expect(lastPush().nova).toEqual(['1', '4', '2'])
    })
  })

  describe('clearing', () => {
    it('removes every filter', () => {
      currentQuery.value = {
        q: 'cocoa',
        category: ['en:snacks'],
        brand: ['lu'],
        country: ['en:france'],
        label: ['en:organic'],
        nutriScore: ['a'],
        nova: ['4'],
      }
      const { clearFilters } = useProductQuery()

      clearFilters()

      expect(lastPush()).toEqual({})
    })

    /**
     * Sort and page size are how the user chose to read the list, not what they
     * chose to look at. Resetting them alongside the filters is the kind of
     * helpfulness that reads as a bug.
     */
    it('keeps the sort and the page size', () => {
      currentQuery.value = { category: ['en:snacks'], sort: 'popularity', pageSize: '48' }
      const { clearFilters } = useProductQuery()

      clearFilters()

      expect(lastPush()).toEqual({ sort: 'popularity', pageSize: '48' })
    })
  })

  it('recovers from a hand-edited URL instead of throwing', () => {
    currentQuery.value = { page: 'banana', nutriScore: 'z', sort: 'nonsense' }

    const { query } = useProductQuery()

    // A stale bookmark or a truncated link is a normal thing to receive, and an
    // error page is a worse answer than the unfiltered directory.
    expect(query.value.page).toBe(1)
    expect(query.value.nutriScore).toEqual([])
    expect(query.value.sort).toBe('relevance')
  })
})
