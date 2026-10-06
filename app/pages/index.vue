<script setup lang="ts">
import {
  EMPTY_PRODUCT_QUERY,
  catalogueSize,
  classifiedShare,
  gradedShare,
  type NutriScoreDistribution,
} from '#shared/domain/search'
import type { NovaGroup, NutriScore } from '#shared/domain/nutrition'

definePageMeta({
  viewTransition: true,
})

const { t } = useI18n()
const format = useFormat()
const localePath = useLocalePath()

const query = computed(() => ({ ...EMPTY_PRODUCT_QUERY, sort: 'popularity' as const }))
const { state, asyncStatus } = useProductSearch(query)

const result = computed(() => state.value.data)
const isLoading = computed(() => asyncStatus.value === 'loading' && !result.value)

const distribution = computed<NutriScoreDistribution>(
  () => result.value?.nutriScoreDistribution ?? {},
)

const figures = computed(() => {
  const total = catalogueSize(distribution.value)
  if (total === null || !result.value) return null

  return {
    total,
    graded: gradedShare(distribution.value),
    classified: classifiedShare(distribution.value, result.value.novaClassifiedCount),
  }
})

const featured = computed(() => result.value?.items.slice(0, 8) ?? [])

const term = ref('')

function search() {
  const q = term.value.trim()
  return navigateTo(localePath({ path: '/products', query: q ? { q } : {} }))
}

const EXAMPLES = [
  {
    key: 'gradedA',
    query: { nutriScore: 'a' satisfies NutriScore },
    count: () => distribution.value.a,
  },
  {
    key: 'ultraProcessed',
    query: { nova: String(4 satisfies NovaGroup) },
    count: () => result.value?.novaDistribution[4],
  },
  {
    key: 'ungraded',
    query: { nutriScore: 'unknown' satisfies NutriScore },
    count: () => distribution.value.unknown,
  },
] as const
</script>

<template>
  <div>
    <UiGradientHero>
      <h1
        class="max-w-3xl font-serif text-[2rem] leading-[1.15] font-semibold text-ink sm:text-[2.75rem] sm:leading-[1.1] lg:text-[3.25rem]"
      >
        {{ t('home.headline') }}
      </h1>

      <i18n-t
        :keypath="figures ? 'home.lead' : 'home.leadApproximate'"
        tag="p"
        scope="global"
        class="mt-4 max-w-xl text-lead text-ink-muted"
      >
        <template #count>
          <span data-numeric class="text-ink">{{
            figures ? format.count(figures.total) : t('home.leadApproximateCount')
          }}</span>
        </template>
      </i18n-t>

      <form
        class="mt-8 flex w-full max-w-2xl flex-col gap-2 sm:flex-row"
        role="search"
        @submit.prevent="search"
      >
        <label for="hero-search" class="sr-only">{{ t('home.searchLabel') }}</label>
        <div class="relative min-w-0 flex-1">
          <UiIcon
            name="search"
            class="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-subtle"
          />
          <input
            id="hero-search"
            v-model="term"
            type="search"
            :placeholder="t('home.searchPlaceholder')"
            class="w-full rounded-control border border-edge bg-surface-raised py-3.5 pr-4 pl-11 text-body text-ink shadow-raised placeholder:text-ink-subtle focus-visible:border-edge-accent focus-visible:outline-none"
          />
        </div>
        <button
          type="submit"
          class="shrink-0 rounded-control bg-accent px-6 py-3 text-label text-ink-on-accent shadow-raised transition-colors hover:bg-accent-hover sm:py-0"
        >
          {{ t('home.search') }}
        </button>
      </form>

      <ul class="mt-8 grid w-full max-w-4xl gap-3 sm:grid-cols-3">
        <li v-for="example in EXAMPLES" :key="example.key">
          <NuxtLink
            :to="localePath({ path: '/products', query: example.query })"
            class="group flex h-full flex-col gap-1 rounded-card border border-edge-subtle bg-surface-raised/80 p-4 text-left backdrop-blur-sm transition-colors hover:border-edge-accent"
          >
            <span class="text-overline text-ink-subtle">
              {{ t(`home.examples.${example.key}.dimension`) }}
            </span>
            <span class="text-subheading text-ink group-hover:text-ink-accent">
              {{ t(`home.examples.${example.key}.label`) }}
            </span>
            <span class="text-caption text-ink-muted">
              {{ t(`home.examples.${example.key}.detail`) }}
            </span>
            <span class="mt-1 min-h-4 text-caption text-ink-subtle">
              <i18n-t
                v-if="example.count() !== undefined"
                keypath="home.exampleCount"
                :plural="example.count()!"
                scope="global"
              >
                <template #count>
                  <span data-numeric>{{ format.countCompact(example.count()!) }}</span>
                </template>
              </i18n-t>
            </span>
          </NuxtLink>
        </li>
      </ul>
    </UiGradientHero>

    <UiPageContainer>
      <section data-scroll-section class="flex scroll-mt-6 flex-col gap-3">
        <div class="flex items-baseline justify-between gap-4">
          <h2 class="text-heading text-ink">{{ t('home.mostScanned') }}</h2>
          <NuxtLink
            :to="localePath({ path: '/products', query: { sort: 'popularity' } })"
            class="inline-flex items-center gap-1.5 text-label text-ink-muted hover:text-ink-accent"
          >
            {{ t('home.seeAll') }}
            <UiIcon name="chevron-right" class="size-2.5" />
          </NuxtLink>
        </div>

        <ul class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          <template v-if="isLoading">
            <li v-for="placeholder in 8" :key="placeholder">
              <UiSkeleton class="aspect-[4/3] w-full rounded-card" />
            </li>
          </template>

          <ProductCard
            v-for="product in featured"
            v-else
            :key="product.code"
            :product="product"
            class="reveal"
          />
        </ul>
      </section>
    </UiPageContainer>
  </div>
</template>
