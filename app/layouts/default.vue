<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
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

      <!--
        Each page brings a footer of its own. A shared one would be the only thing on screen to
        move when a page opens, and a product page opens once its record is here, often more than
        half a second after the tap: past that, the browser counts the move as a layout shift.
      -->
      <ChromeFooter :key="route.path" />
    </div>
  </div>
</template>
