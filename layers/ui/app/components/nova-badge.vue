<script setup lang="ts">
import { NOVA_SHORT_LABELS, type NovaGroup } from '#shared/domain/nutrition'

/**
 * NOVA food processing group.
 *
 * Ordinal 1 to 4, so it gets the sequential ramp rather than the categorical
 * palette: the steps are ordered, and a categorical palette would say they are
 * not. As with the Nutri-Score badge, the number carries the value and colour
 * only reinforces it.
 */
withDefaults(
  defineProps<{
    group: NovaGroup | null
    /** Adds the group's name beside the number. */
    withLabel?: boolean
  }>(),
  { withLabel: false },
)

const GROUP_CLASSES: Record<NovaGroup, string> = {
  1: 'bg-nova-1',
  2: 'bg-nova-2',
  3: 'bg-nova-3',
  4: 'bg-nova-4',
}
</script>

<template>
  <span class="inline-flex items-center gap-1.5">
    <span
      class="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-caption font-semibold text-white"
      :class="group === null ? 'bg-nova-unknown text-ink-muted' : GROUP_CLASSES[group]"
      role="img"
      :aria-label="
        group === null
          ? 'NOVA processing group not available'
          : `NOVA group ${group}, ${NOVA_SHORT_LABELS[group]}`
      "
    >
      <span aria-hidden="true">{{ group ?? '?' }}</span>
    </span>
    <span v-if="withLabel" class="text-label text-ink-muted" aria-hidden="true">
      {{ group === null ? 'Unknown' : NOVA_SHORT_LABELS[group] }}
    </span>
  </span>
</template>
