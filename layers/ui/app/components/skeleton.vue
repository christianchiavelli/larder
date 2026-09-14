<script setup lang="ts">
/**
 * Loading placeholder.
 *
 * The pulse is suppressed under `prefers-reduced-motion`, where a page of
 * breathing rectangles is not a neutral choice. The static shape still reads as
 * "loading" on its own.
 */
withDefaults(defineProps<{ rounded?: 'control' | 'card' | 'full' }>(), { rounded: 'control' })
</script>

<template>
  <div
    class="animate-pulse bg-surface-sunken motion-reduce:animate-none"
    :class="{
      'rounded-control': rounded === 'control',
      'rounded-card': rounded === 'card',
      'rounded-full': rounded === 'full',
    }"
    aria-hidden="true"
  />
</template>
