<script setup lang="ts">
import type { FacetItem } from '#shared/domain/search'

const props = withDefaults(
  defineProps<{
    title: string
    items: FacetItem[]
    selected: string[]
    limit?: number
    loading?: boolean
  }>(),
  { limit: 6, loading: false },
)

defineEmits<{ toggle: [key: string] }>()

const { t } = useI18n()
const format = useFormat()

const expanded = ref(false)

const visible = computed(() => {
  const selectedSet = new Set(props.selected)
  const shown = expanded.value ? props.items : props.items.slice(0, props.limit)
  const shownKeys = new Set(shown.map((item) => item.key))

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

    <!-- The list's own shape, a row for each option it shows and the line of its button,
         so the groups below are already where the options will leave them. -->
    <div v-if="loading" class="reveal" aria-hidden="true">
      <ul class="flex flex-col gap-1">
        <li
          v-for="index in limit"
          :key="index"
          class="flex items-center gap-2 px-1 py-0.5 text-label"
        >
          <UiSkeleton class="size-4 shrink-0" />
          <UiSkeleton class="h-[1lh] flex-1" />
        </li>
      </ul>
      <!-- Text, like the button, so it sits on the line the button's words would. -->
      <span
        class="mt-1.5 inline-block w-24 animate-pulse rounded-control bg-surface-sunken text-caption"
      >
        &nbsp;
      </span>
    </div>

    <p v-else-if="items.length === 0 && selected.length === 0" class="text-caption text-ink-subtle">
      {{ t('filters.noOptions') }}
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
            :title="t('filters.countTitle', { count: format.count(item.count) }, item.count)"
            data-numeric
          >
            {{ format.countCompact(item.count) }}
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
      {{ expanded ? t('filters.showFewer') : t('filters.showMore', { count: hiddenCount }) }}
    </button>
  </fieldset>
</template>
