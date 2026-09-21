<script setup lang="ts">
defineProps<{
  to: string
  label: string
}>()
</script>

<template>
  <NuxtLink
    :to="to"
    :aria-label="label"
    class="group relative flex size-10 items-center justify-center rounded-control text-chrome-ink transition-colors hover:bg-chrome-raised hover:text-chrome-ink-strong"
    active-class="bg-chrome-raised text-chrome-ink-strong"
  >
    <slot />

    <span
      aria-hidden="true"
      class="pointer-events-none absolute left-full z-50 ml-2 origin-left scale-95 rounded-control bg-chrome-raised px-2 py-1 text-caption whitespace-nowrap text-chrome-ink-strong opacity-0 shadow-overlay transition group-hover:scale-100 group-hover:opacity-100"
    >
      {{ label }}
    </span>
  </NuxtLink>
</template>
