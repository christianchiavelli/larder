<script setup lang="ts">
/**
 * The pulse is suppressed under `prefers-reduced-motion`.
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
