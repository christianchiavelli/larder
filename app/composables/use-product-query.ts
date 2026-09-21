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

type ListDimension = 'category' | 'brand' | 'country' | 'label'

export function useProductQuery() {
  const route = useRoute()
  const router = useRouter()

  const query = computed<ProductQuery>(() => productQuerySchema.parse(route.query))

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

  function toggleTag(dimension: ListDimension, value: string) {
    const id = toFilterValue(dimension, value)
    const current = query.value[dimension]
    const next = current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]

    return apply({ [dimension]: next } as Partial<ProductQuery>)
  }

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
