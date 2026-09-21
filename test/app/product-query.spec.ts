import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { LocationQuery } from 'vue-router'

const currentQuery = ref<LocationQuery>({})
const push = vi.fn((to: { query: LocationQuery }) => {
  currentQuery.value = to.query
  return Promise.resolve()
})

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

    expect(lastPush()).toEqual({ q: 'cocoa' })
  })

  describe('the page number', () => {
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
    it.each(['category', 'country', 'label'] as const)('adds a %s', (dimension) => {
      const { toggleTag } = useProductQuery()

      toggleTag(dimension, 'en:snacks')

      expect(lastPush()[dimension]).toEqual(['en:snacks'])
    })

    it.each(['category', 'country', 'label'] as const)(
      'removes a %s that is already applied',
      (dimension) => {
        currentQuery.value = { [dimension]: ['en:snacks', 'en:drinks'] }
        const { toggleTag } = useProductQuery()

        toggleTag(dimension, 'en:snacks')

        expect(lastPush()[dimension]).toEqual(['en:drinks'])
      },
    )

    it('adds a brand from the facet and from a suggestion as one filter', () => {
      const { toggleTag } = useProductQuery()

      toggleTag('brand', 'en:olivari')

      expect(lastPush().brand).toEqual(['olivari'])
    })

    it('removes a brand whichever spelling it is given', () => {
      currentQuery.value = { brand: ['olivari', 'carrefour'] }
      const { toggleTag } = useProductQuery()

      toggleTag('brand', 'en:olivari')

      expect(lastPush().brand).toEqual(['carrefour'])
    })

    it('drops the parameter entirely once the last value is removed', () => {
      currentQuery.value = { category: ['en:snacks'] }
      const { toggleTag } = useProductQuery()

      toggleTag('category', 'en:snacks')

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

    expect(query.value.page).toBe(1)
    expect(query.value.nutriScore).toEqual([])
    expect(query.value.sort).toBe('relevance')
  })
})
