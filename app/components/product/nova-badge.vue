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

/**
 * Fill and ink together, never separately.
 *
 * The ramp runs green to red through two yellows, and no single ink clears AA
 * on all four: white disappears on the yellows, dark disappears on the red. So
 * each step ships the ink that works on it, exactly as the Nutri-Score badge
 * does, and the pair is one token in one place so neither can be changed alone.
 */
const GROUP_CLASSES: Record<NovaGroup, string> = {
  1: 'bg-nova-1 text-nova-1-ink',
  2: 'bg-nova-2 text-nova-2-ink',
  3: 'bg-nova-3 text-nova-3-ink',
  4: 'bg-nova-4 text-nova-4-ink',
}
</script>

<template>
  <span class="inline-flex items-center gap-1.5">
    <span
      class="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-caption font-semibold"
      :class="group === null ? 'bg-nova-unknown text-nova-unknown-ink' : GROUP_CLASSES[group]"
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
