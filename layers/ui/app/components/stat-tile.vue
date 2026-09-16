<script setup lang="ts">
/**
 * A single headline figure.
 *
 * Two things this deliberately does not do. It does not accept a pre-formatted
 * string for the value, because a figure formatted by the caller loses the
 * tabular alignment and the machine-readable form. And when the value is
 * absent, it renders an em-dash rather than a zero: in a catalogue where most
 * products declare only some of their nutrients, "not reported" and "none"
 * are different facts, and showing one as the other is a lie the reader
 * has no way to detect.
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
      class="flex items-baseline gap-1 text-ink"
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
