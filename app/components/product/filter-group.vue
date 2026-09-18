<script setup lang="ts">
import type { FacetItem } from '#shared/domain/search'

/**
 * A selected value is always rendered, even when it falls outside the top N or
 * out of the facet counts, or applying a filter can hide its own checkbox.
 */
const props = withDefaults(
  defineProps<{
    title: string
    items: FacetItem[]
    selected: string[]
    /** How many options to show before collapsing. */
    limit?: number
    loading?: boolean
  }>(),
  { limit: 6, loading: false },
)

defineEmits<{ toggle: [key: string] }>()

const expanded = ref(false)

const visible = computed(() => {
  const selectedSet = new Set(props.selected)
  const shown = expanded.value ? props.items : props.items.slice(0, props.limit)
  const shownKeys = new Set(shown.map((item) => item.key))

  // Selected values that the facet response no longer lists, pinned on so the
  // filter can always be removed.
  const orphans = props.selected
    .filter((key) => !shownKeys.has(key))
    .map((key) => props.items.find((item) => item.key === key) ?? { key, label: key, count: 0 })

  return [...orphans.filter((item) => selectedSet.has(item.key)), ...shown]
})

const hiddenCount = computed(() => Math.max(0, props.items.length - props.limit))
</script>

<template>
  <fieldset class="border-0 p-0">
    <legend class="mb-2 text-overline text-ink-subtle uppercase">{{ title }}</legend>

    <div v-if="loading" class="flex flex-col gap-2">
      <UiSkeleton v-for="index in 4" :key="index" class="h-5 w-full" />
    </div>

    <p v-else-if="items.length === 0 && selected.length === 0" class="text-caption text-ink-subtle">
      No options for the current results
    </p>

    <ul v-else class="reveal flex flex-col gap-1">
      <li v-for="item in visible" :key="item.key">
        <UiCheckboxRow :checked="selected.includes(item.key)" @toggle="$emit('toggle', item.key)">
          <span class="min-w-0 flex-1 truncate text-label text-ink" :title="item.label">
            {{ item.label }}
          </span>
          <span
            v-if="item.count > 0"
            class="shrink-0 text-caption text-ink-subtle tabular-nums"
            :title="`${formatCount(item.count)} products`"
            data-numeric
          >
            {{ formatCountCompact(item.count) }}
          </span>
        </UiCheckboxRow>
      </li>
    </ul>

    <button
      v-if="hiddenCount > 0 && !loading"
      type="button"
      class="mt-1.5 text-caption text-ink-accent underline underline-offset-2"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      {{ expanded ? 'Show fewer' : `Show ${hiddenCount} more` }}
    </button>
  </fieldset>
</template>
