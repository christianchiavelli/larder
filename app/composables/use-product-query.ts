import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  clearedFilters,
  productQuerySchema,
  toQueryParams,
  type ProductQuery,
  type SortOption,
} from '#shared/domain/search'
import type { NutriScore, NovaFilterValue } from '#shared/domain/nutrition'
import { toFilterValue } from '#shared/domain/taxonomy'

/**
 * The URL is the state, not a copy of it: no store and no two-way watcher, so
 * there is no moment where the address bar and the results disagree. Sharing,
 * bookmarking and the back button then work with nothing written for them.
 */

type ListDimension = 'category' | 'brand' | 'country' | 'label'

export function useProductQuery() {
  const route = useRoute()
  const router = useRouter()

  /** The schema drops anything malformed, so a stale link still renders. */
  const query = computed<ProductQuery>(() => productQuerySchema.parse(route.query))

  /**
   * Merged onto the parsed query, never onto its serialised form:
   * `toQueryParams` omits defaults, so merging two serialised objects cannot
   * express removal and clearing a filter leaves it applied.
   *
   * A filter change resets to page one, or narrowing drops the reader on an
   * empty page 8 of a result set that now has 3.
   */
  function apply(patch: Partial<ProductQuery>, options: { keepPage?: boolean } = {}) {
    const next = productQuerySchema.parse({
      ...query.value,
      ...patch,
      ...(options.keepPage ? {} : { page: 1 }),
    })

    return router.push({ query: toQueryParams(next) })
  }

  function setSearchTerm(term: string) {
    return apply({ q: term })
  }

  function setSort(sort: SortOption) {
    return apply({ sort }, { keepPage: true })
  }

  function setPage(page: number) {
    return apply({ page }, { keepPage: true })
  }

  function setPageSize(pageSize: number) {
    return apply({ pageSize })
  }

  /**
   * Normalised first: the value arrives either as a facet key or as a taxonomy
   * suggestion, which prefixes brands. Comparing the two raw means "remove"
   * never matches and adds a second copy of the same filter.
   */
  function toggleTag(dimension: ListDimension, value: string) {
    const id = toFilterValue(dimension, value)
    const current = query.value[dimension]
    const next = current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]

    return apply({ [dimension]: next } as Partial<ProductQuery>)
  }

  /** Takes an absence as readily as a grade; they are most of the catalogue. */
  function toggleNutriScore(grade: NutriScore) {
    const current = query.value.nutriScore
    return apply({
      nutriScore: current.includes(grade)
        ? current.filter((entry) => entry !== grade)
        : [...current, grade],
    })
  }

  function toggleNova(group: NovaFilterValue) {
    const current = query.value.nova
    return apply({
      nova: current.includes(group)
        ? current.filter((entry) => entry !== group)
        : [...current, group],
    })
  }

  /** Sort and page size are preferences, so they survive. */
  function clearFilters() {
    return apply(clearedFilters())
  }

  return {
    query,
    apply,
    setSearchTerm,
    setSort,
    setPage,
    setPageSize,
    toggleTag,
    toggleNutriScore,
    toggleNova,
    clearFilters,
  }
}
