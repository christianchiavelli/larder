<script setup lang="ts">
import {
  NUTRI_SCORE_VALUES,
  NOVA_FILTER_LABELS,
  NOVA_FILTER_VALUES,
  NOVA_UNGROUPED,
} from '#shared/domain/nutrition'
import { activeFilterCount, hasActiveFilters } from '#shared/domain/search'
import type { ProductSearchResult } from '#shared/domain/search'

/**
 * Facets come in as a prop, the selection is read from the URL. Two props
 * instead of seven props and six events.
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
          v-for="grade in NUTRI_SCORE_VALUES"
          :key="grade"
          type="button"
          class="inline-flex rounded-control-frame border p-1 transition-colors"
          :class="
            query.nutriScore.includes(grade)
              ? 'border-edge-selected bg-surface-selected'
              : 'border-transparent hover:bg-surface-hover'
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
        <UiCheckboxRow
          v-for="group in NOVA_FILTER_VALUES"
          :key="group"
          :checked="query.nova.includes(group)"
          @toggle="toggleNova(group)"
        >
          <ProductNovaBadge :group="group === NOVA_UNGROUPED ? null : group" />
          <span class="text-label text-ink">{{ NOVA_FILTER_LABELS[group] }}</span>
        </UiCheckboxRow>
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
