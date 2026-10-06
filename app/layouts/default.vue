<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div class="flex min-h-dvh bg-chrome">
    <a
      href="#main"
      class="skip-link rounded-control bg-accent px-3 py-2 text-label text-ink-on-accent"
    >
      {{ t('chrome.skipToContent') }}
    </a>

    <ChromeRail />

    <div class="ml-rail flex min-w-0 flex-1 flex-col overflow-hidden rounded-tl-shell bg-surface">
      <!-- A column, so a page shorter than the screen can stretch and centre what it holds. -->
      <main id="main" class="flex flex-1 flex-col">
        <slot />
        <UiSeeMoreFab />
      </main>

      <ChromeFooter />
    </div>
  </div>
</template>
