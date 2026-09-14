<script setup lang="ts">
const { siteName } = useRuntimeConfig().public

useHead({
  titleTemplate: (title) => (title ? `${title} — ${siteName}` : siteName),
  htmlAttrs: { lang: 'en' },
})
</script>

<template>
  <div class="min-h-dvh bg-surface text-ink">
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </div>
</template>
