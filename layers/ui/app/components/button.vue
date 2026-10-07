<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary'
    /** A page of the app to go to, which makes the button a link. */
    to?: string
    /** What it is when it goes nowhere in the app: a file to download is a link too. */
    tag?: 'button' | 'a'
  }>(),
  { variant: 'primary', tag: 'button' },
)

// Resolved here, where Nuxt can see it: a name handed to <component :is> at runtime renders
// an unknown <NuxtLink> element, which looks like a button but goes nowhere.
const NuxtLink = resolveComponent('NuxtLink')

const VARIANT_CLASSES = {
  primary: 'bg-accent text-ink-on-accent hover:bg-accent-hover',
  secondary: 'border border-edge-strong bg-surface-raised text-ink hover:bg-surface-hover',
} as const
</script>

<template>
  <component
    :is="to ? NuxtLink : tag"
    :to="to"
    :type="!to && tag === 'button' ? 'button' : undefined"
    class="inline-flex h-9 items-center justify-center gap-2 rounded-control px-4 text-label transition-colors"
    :class="VARIANT_CLASSES[variant]"
  >
    <slot />
  </component>
</template>
