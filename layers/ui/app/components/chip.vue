<script setup lang="ts">
/**
 * A small pill for a tag, label or category.
 *
 * `tone` is the whole API, because the only decision a caller has is what the
 * chip means: `accent` for something the product claims about itself (organic,
 * fair trade), `neutral` for a plain classification, `muted` for something
 * present but not endorsed, such as an additive code.
 *
 * Renders as a link when given `to`, and as a static span otherwise. A chip
 * that does nothing must not look identical to one that filters the catalogue.
 */
withDefaults(
  defineProps<{
    tone?: 'accent' | 'neutral' | 'muted'
    to?: string
    title?: string
  }>(),
  { tone: 'neutral' },
)

const TONE_CLASSES = {
  accent: 'bg-accent text-ink-on-accent',
  neutral: 'bg-surface-sunken text-ink border border-edge-subtle',
  muted: 'bg-transparent text-ink-muted border border-edge',
} as const
</script>

<template>
  <component
    :is="to ? 'NuxtLink' : 'span'"
    :to="to"
    :title="title"
    class="inline-flex max-w-full items-center rounded-pill px-2.5 py-1 text-caption font-medium"
    :class="[
      TONE_CLASSES[tone],
      to && 'transition-colors hover:brightness-95 motion-reduce:transition-none',
    ]"
  >
    <span class="truncate"><slot /></span>
  </component>
</template>
