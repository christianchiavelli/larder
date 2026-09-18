<script setup lang="ts">
/**
 * The pulse stops under `prefers-reduced-motion`, by the project-wide rule at
 * the end of `ui.css` rather than by anything stated here.
 */
withDefaults(defineProps<{ rounded?: 'control' | 'card' | 'full' }>(), { rounded: 'control' })
</script>

<template>
  <div
    class="animate-pulse bg-surface-sunken"
    :class="{
      'rounded-control': rounded === 'control',
      'rounded-card': rounded === 'card',
      'rounded-full': rounded === 'full',
    }"
    aria-hidden="true"
  />
</template>
