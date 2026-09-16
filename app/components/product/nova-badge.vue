<script setup lang="ts">
import { NOVA_LABELS, NOVA_SHORT_LABELS, type NovaGroup } from '#shared/domain/nutrition'

/**
 * NOVA food processing group.
 *
 * Ordinal 1 to 4, so it gets the sequential ramp rather than the categorical
 * palette: the steps are ordered, and a categorical palette would say they are
 * not. As with the Nutri-Score badge, the number carries the value and colour
 * only reinforces it.
 *
 * Round at every size, where a Nutri-Score is square at every size. Two scales
 * sit side by side on a row and on a product page, and the shape is what tells
 * them apart before either number is read.
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
 * Fill and ink together, never separately.
 *
 * The ramp runs green to red through two yellows, and no single ink clears AA
 * on all four: white disappears on the yellows, dark disappears on the red. So
 * each step ships the ink that works on it, exactly as the Nutri-Score badge
 * does, and the pair is one token in one place so neither can be changed alone.
 *
 * The product page used to draw its own copy of this chip with `text-white`
 * fixed, which is the failure the pairing exists to prevent: white on the
 * lighter yellow measures 1.95:1, against a floor of 4.5.
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
