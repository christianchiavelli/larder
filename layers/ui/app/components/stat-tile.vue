<script setup lang="ts">
/**
 * No pre-formatted string: a value formatted by the caller loses the tabular
 * alignment. An absent value renders an em-dash, never a zero.
 */
const props = withDefaults(
  defineProps<{
    label: string
    value: number | null
    unit?: string
    precision?: number
    /** Extra context under the figure, such as what the total is out of. */
    caption?: string
    size?: 'md' | 'lg'
    loading?: boolean
  }>(),
  { precision: 0, size: 'md', loading: false },
)

const formatted = computed(() =>
  props.value === null ? null : formatMeasure(props.value, props.precision),
)
</script>

<template>
  <div class="flex flex-col gap-1">
    <span class="text-overline text-ink-subtle uppercase">{{ label }}</span>

    <UiSkeleton v-if="loading" class="h-8 w-24" />

    <p
      v-else
      class="reveal flex items-baseline gap-1 text-ink"
      :class="size === 'lg' ? 'text-metric' : 'text-metric-sm'"
    >
      <template v-if="formatted !== null">
        <span data-numeric>{{ formatted }}</span>
        <span v-if="unit" class="text-label text-ink-muted">{{ unit }}</span>
      </template>
      <span v-else class="text-ink-subtle" :aria-label="`${label} not reported`">
        <span aria-hidden="true">&mdash;</span>
      </span>
    </p>

    <span v-if="caption && !loading" class="text-caption text-ink-subtle">{{ caption }}</span>
  </div>
</template>
