<script setup lang="ts">
const { toggle } = useTheme()
const { siteName } = useRuntimeConfig().public
const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <div class="fixed inset-y-0 left-0 z-40 flex w-rail flex-col items-center bg-chrome py-3">
    <NuxtLink
      :to="localePath('/')"
      class="flex size-10 items-center justify-center rounded-control text-chrome-ink-strong transition-colors hover:bg-chrome-raised"
      :aria-label="t('chrome.home', { site: siteName })"
    >
      <span class="font-serif text-[1.65rem] leading-none font-semibold" aria-hidden="true">L</span>
    </NuxtLink>

    <nav :aria-label="t('chrome.primary')" class="mt-4 flex flex-col items-center gap-1">
      <ChromeRailLink :to="localePath('/overview')" :label="t('chrome.overview')">
        <UiIcon name="chart-simple" class="size-5" />
      </ChromeRailLink>

      <ChromeRailLink :to="localePath('/products')" :label="t('chrome.products')">
        <UiIcon name="box" class="size-5" />
      </ChromeRailLink>
    </nav>

    <ChromeLanguageSwitch class="mt-auto mb-2" />

    <button
      type="button"
      class="flex size-10 items-center justify-center rounded-control text-chrome-ink transition-colors hover:bg-chrome-raised hover:text-chrome-ink-strong"
      @click="toggle()"
    >
      <UiIcon name="moon" class="size-[1.15rem] dark:hidden" />
      <span class="sr-only dark:hidden">{{ t('chrome.toDarkTheme') }}</span>

      <UiIcon name="sun" class="hidden size-[1.15rem] dark:block" />
      <span class="sr-only hidden dark:block">{{ t('chrome.toLightTheme') }}</span>
    </button>
  </div>
</template>
