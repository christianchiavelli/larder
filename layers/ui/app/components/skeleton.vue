<script setup lang="ts">
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
