<script setup lang="ts">
import { THEME_BOOTSTRAP_SCRIPT } from '~/composables/use-theme'

const { siteName } = useRuntimeConfig().public

useHead({
  titleTemplate: (title) => (title ? `${title} | ${siteName}` : siteName),
  htmlAttrs: { lang: 'en' },
  script: [
    // Blocking, in head, before any paint. See use-theme.ts for why.
    { innerHTML: THEME_BOOTSTRAP_SCRIPT, tagPriority: 'critical' },
  ],
  meta: [
    {
      name: 'description',
      content:
        'Explore nutrition, processing and labelling across a public catalogue of packaged food products.',
    },
  ],
})
</script>

<template>
  <div class="min-h-dvh bg-surface text-ink">
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
