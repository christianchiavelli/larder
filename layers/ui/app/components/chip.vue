<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?: 'accent' | 'neutral' | 'muted'
    to?: string
    title?: string
  }>(),
  { tone: 'neutral' },
)

// Resolved here, where Nuxt can see it: a name handed to <component :is> at runtime renders
// an unknown <NuxtLink> element, which looks like a chip but goes nowhere.
const NuxtLink = resolveComponent('NuxtLink')

const TONE_CLASSES = {
  accent: 'bg-accent text-ink-on-accent',
  neutral: 'bg-surface-sunken text-ink border border-edge-subtle',
  muted: 'bg-transparent text-ink-muted border border-edge',
} as const
</script>

<template>
  <component
    :is="to ? NuxtLink : 'span'"
    :to="to"
    :title="title"
    class="inline-flex max-w-full items-center rounded-pill px-2.5 py-1 text-caption font-medium"
    :class="[TONE_CLASSES[tone], to && 'transition-colors hover:brightness-95']"
  >
    <span class="truncate"><slot /></span>
  </component>
</template>
