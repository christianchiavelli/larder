<script setup lang="ts">
import { THEME_BOOTSTRAP_SCRIPT } from '~/composables/use-theme'

const { siteName } = useRuntimeConfig().public
const { t } = useI18n()
// The page's language on <html>, and the same page's address in every language for search engines.
const localeHead = useLocaleHead()

useHead(() => ({
  titleTemplate: (title?: string) => (title ? `${title} | ${siteName}` : siteName),
  htmlAttrs: localeHead.value.htmlAttrs,
  link: localeHead.value.link,
  script: [{ innerHTML: THEME_BOOTSTRAP_SCRIPT, tagPriority: 'critical' }],
  meta: [{ name: 'description', content: t('site.description') }, ...(localeHead.value.meta ?? [])],
}))
</script>

<template>
  <div class="min-h-dvh bg-surface text-ink">
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
