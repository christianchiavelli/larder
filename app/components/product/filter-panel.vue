<script setup lang="ts">
import { NUTRI_SCORE_GRADES, NOVA_GROUPS, NOVA_SHORT_LABELS } from '#shared/domain/nutrition'
import { activeFilterCount, hasActiveFilters } from '#shared/domain/search'
import type { ProductSearchResult } from '#shared/domain/search'

/**
 * The directory's filter panel.
 *
 * Takes the facets as a prop and the filter state from the URL, which is the
 * split that matters: the counts are data the page fetched, and the selection
 * is not state this component owns or that anyone has to hand it. That is the
 * practical payoff of keeping the query in the address bar, and the reason this
 * has two props instead of seven props and six events.
 */
defineProps<{
  facets: ProductSearchResult['facets'] | null
  loading?: boolean
}>()

const { query, toggleTag, toggleNutriScore, toggleNova, clearFilters } = useProductQuery()

const filterCount = computed(() => activeFilterCount(query.value))
const showingFilters = computed(() => hasActiveFilters(query.value))
</script>

<template>
  <aside class="flex shrink-0 flex-col gap-5 lg:w-[17rem]" aria-label="Filters">
    <div class="flex items-center justify-between gap-2">
      <h2 class="text-subheading text-ink">
        Filters
        <span v-if="filterCount > 0" class="text-label text-ink-subtle" data-numeric>
          ({{ filterCount }})
        </span>
      </h2>
      <button
        v-if="showingFilters"
        type="button"
        class="text-caption text-ink-accent underline underline-offset-2"
        @click="clearFilters()"
      >
        Clear all
      </button>
    </div>

    <fieldset class="border-0 p-0">
      <legend class="mb-2 text-overline text-ink-subtle uppercase">Nutri-Score</legend>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="grade in NUTRI_SCORE_GRADES"
          :key="grade"
          type="button"
          class="rounded-control border p-0.5 transition-colors motion-reduce:transition-none"
          :class="
            query.nutriScore.includes(grade)
              ? 'border-edge-accent bg-surface-accent'
              : 'border-transparent hover:border-edge'
          "
          :aria-pressed="query.nutriScore.includes(grade)"
          @click="toggleNutriScore(grade)"
        >
          <ProductNutriScoreBadge :grade="grade" size="sm" />
        </button>
      </div>
    </fieldset>

    <fieldset class="border-0 p-0">
      <legend class="mb-2 text-overline text-ink-subtle uppercase">Processing (NOVA)</legend>
      <div class="flex flex-col gap-1">
        <label
          v-for="group in NOVA_GROUPS"
          :key="group"
          class="flex cursor-pointer items-center gap-2 rounded-control px-1 py-0.5 hover:bg-surface-hover"
        >
          <input
            type="checkbox"
            class="size-4 shrink-0 accent-accent"
            :checked="query.nova.includes(group)"
            @change="toggleNova(group)"
          />
          <ProductNovaBadge :group="group" />
          <span class="text-label text-ink">{{ NOVA_SHORT_LABELS[group] }}</span>
        </label>
      </div>
    </fieldset>

    <ProductFilterGroup
      title="Category"
      :items="facets?.categories_tags ?? []"
      :selected="query.category"
      :loading="loading"
      @toggle="toggleTag('category', $event)"
    />

    <ProductFilterGroup
      title="Brand"
      :items="facets?.brands_tags ?? []"
      :selected="query.brand"
      :loading="loading"
      @toggle="toggleTag('brand', $event)"
    />

    <ProductFilterGroup
      title="Country"
      :items="facets?.countries_tags ?? []"
      :selected="query.country"
      :loading="loading"
      @toggle="toggleTag('country', $event)"
    />
  </aside>
</template>
