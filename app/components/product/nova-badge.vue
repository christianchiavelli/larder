<script setup lang="ts">
import { NOVA_LABELS, NOVA_SHORT_LABELS, type NovaGroup } from '#shared/domain/nutrition'

/**
 * Round at every size, where Nutri-Score is square: the two sit side by side and
 * the shape tells them apart before either number is read.
 */
withDefaults(
  defineProps<{
    group: NovaGroup | null
    size?: 'sm' | 'lg'
    /** Adds the group's name beside the number. */
    withLabel?: boolean
  }>(),
  { size: 'sm', withLabel: false },
)

/**
 * Fill and ink are one token: the ramp runs green to red through two yellows and
 * no single ink clears AA on all four.
 */
const GROUP_CLASSES: Record<NovaGroup, string> = {
  1: 'bg-nova-1 text-nova-1-ink',
  2: 'bg-nova-2 text-nova-2-ink',
  3: 'bg-nova-3 text-nova-3-ink',
  4: 'bg-nova-4 text-nova-4-ink',
}

const SIZE_CLASSES = {
  sm: 'size-5 text-caption',
  lg: 'size-10 text-heading',
} as const
</script>

<template>
  <span class="inline-flex items-center gap-1.5">
    <span
      class="inline-flex shrink-0 items-center justify-center rounded-full font-semibold"
      :class="[
        SIZE_CLASSES[size],
        group === null ? 'bg-nova-unknown text-nova-unknown-ink' : GROUP_CLASSES[group],
      ]"
      role="img"
      :aria-label="
        group === null
          ? 'NOVA processing group not available'
          : `NOVA group ${group}, ${NOVA_LABELS[group]}`
      "
    >
      <span aria-hidden="true">{{ group ?? '?' }}</span>
    </span>
    <span v-if="withLabel" class="text-label text-ink-muted" aria-hidden="true">
      {{ group === null ? 'Unknown' : NOVA_SHORT_LABELS[group] }}
    </span>
  </span>
</template>
