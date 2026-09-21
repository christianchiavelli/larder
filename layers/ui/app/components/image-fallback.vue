<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: 'sm' | 'lg'
    label?: string
  }>(),
  { size: 'sm' },
)

const GLYPH_SIZE = { sm: 'size-4', lg: 'size-7' } as const
</script>

<template>
  <span
    class="flex size-full items-center justify-center bg-surface-sunken text-ink-subtle"
    :aria-hidden="label ? undefined : true"
    :aria-label="label"
    :role="label ? 'img' : undefined"
  >
    <UiIcon name="image" :class="GLYPH_SIZE[size]" />
  </span>
</template>
