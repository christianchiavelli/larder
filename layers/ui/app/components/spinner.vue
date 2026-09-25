<script setup lang="ts">
defineProps<{
  label?: string
}>()
</script>

<template>
  <svg
    viewBox="0 0 16 16"
    fill="none"
    class="animate-spin"
    data-motion="essential"
    data-testid="spinner"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : true"
  >
    <circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-opacity="0.2" stroke-width="2.5" />
    <path
      d="M8 1.75a6.25 6.25 0 0 1 5.41 9.375"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
    />
  </svg>
</template>
