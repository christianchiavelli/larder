<script setup lang="ts">
/**
 * `as` exists so a card can be a section, an article or a list item: the visual
 * treatment and the document outline are separate decisions.
 */
withDefaults(
  defineProps<{
    as?: string
    padding?: 'none' | 'sm' | 'md' | 'lg'
    interactive?: boolean
  }>(),
  { as: 'div', padding: 'md', interactive: false },
)
</script>

<template>
  <component
    :is="as"
    class="rounded-card border border-edge-subtle bg-surface-raised shadow-card"
    :class="[
      {
        'p-0': padding === 'none',
        'p-3': padding === 'sm',
        'p-4': padding === 'md',
        'p-6': padding === 'lg',
      },
      interactive &&
        'transition-colors hover:border-edge hover:bg-surface-hover focus-within:border-edge-accent motion-reduce:transition-none',
    ]"
  >
    <slot />
  </component>
</template>
