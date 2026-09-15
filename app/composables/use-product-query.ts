import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  productQuerySchema,
  toQueryParams,
  type ProductQuery,
  type SortOption,
} from '#shared/domain/search'
import type { NutriScore, NovaGroup } from '#shared/domain/nutrition'
import { toFilterValue } from '#shared/domain/taxonomy'

/**
 * Directory filter state, held in the URL.
 *
 * The URL is the state, not a copy of it. There is no store behind this and no
 * `watch` synchronising two directions, because either would introduce a moment
 * where the address bar and the results disagree.
 *
 * What that buys is not tidiness. Every view in this app is then shareable,
 * bookmarkable and reachable by the back button without a line of code written
 * for any of those. Filter state kept in a store gets all three wrong by
 * default, and each one has to be rebuilt by hand.
 */

/** Filter dimensions that hold a list of values. */
type ListDimension = 'category' | 'brand' | 'country' | 'label'

export function useProductQuery() {
  const route = useRoute()
  const router = useRouter()

  /**
   * Parsed from the URL on every read. The schema drops anything malformed, so
   * a hand-edited or stale link degrades to a valid query rather than an error
   * page.
   */
  const query = computed<ProductQuery>(() => productQuerySchema.parse(route.query))

  /**
   * Writes a patch to the URL.
   *
   * The patch is merged onto the parsed query, never onto its serialised form.
   * `toQueryParams` omits anything at its default, so merging two serialised
   * objects cannot express removal: emptying a dimension drops its key from the
   * patch, and the earlier value survives the spread. Clearing the filters left
   * every one of them applied.
   *
   * Any filter change resets to page one. Keeping the page number while
   * narrowing the results is how a user lands on an empty page 8 of a result
   * set that now has 3, and then reasonably concludes the filter is broken.
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
    // The first page of a larger size overlaps what the user was already
    // reading, which is the least disorienting place to land.
    return apply({ pageSize })
  }

  /**
   * Adds a value to a dimension, or removes it when it is already applied.
   *
   * The incoming value is normalised first, because it can come from either of
   * two vocabularies: a facet key, which is already the stored form, or a
   * taxonomy suggestion, which prefixes brands with a language the search index
   * does not use. Comparing the two directly means "remove" never matches and
   * silently adds a second copy of the same filter.
   */
  function toggleTag(dimension: ListDimension, value: string) {
    const id = toFilterValue(dimension, value)
    const current = query.value[dimension]
    const next = current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]

    return apply({ [dimension]: next } as Partial<ProductQuery>)
  }

  /**
   * Takes an absence as readily as a grade.
   *
   * Between them the two absences are most of the catalogue, and they are asked
   * for separately: someone hunting for products that ought to carry a grade
   * wants the ungraded ones without the beers and vinegars mixed in.
   */
  function toggleNutriScore(grade: NutriScore) {
    const current = query.value.nutriScore
    return apply({
      nutriScore: current.includes(grade)
        ? current.filter((entry) => entry !== grade)
        : [...current, grade],
    })
  }

  function toggleNova(group: NovaGroup) {
    const current = query.value.nova
    return apply({
      nova: current.includes(group)
        ? current.filter((entry) => entry !== group)
        : [...current, group],
    })
  }

  /** Clears every filter. Sort and page size are preferences, so they survive. */
  function clearFilters() {
    return apply({
      q: '',
      category: [],
      brand: [],
      country: [],
      label: [],
      nutriScore: [],
      nova: [],
    })
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
