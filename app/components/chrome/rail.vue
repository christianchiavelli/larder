<script setup lang="ts">
const { toggle } = useTheme()
const { siteName } = useRuntimeConfig().public
</script>

<template>
  <div class="fixed inset-y-0 left-0 z-40 flex w-rail flex-col items-center bg-chrome py-3">
    <NuxtLink
      to="/"
      class="flex size-10 items-center justify-center rounded-control text-chrome-ink-strong transition-colors hover:bg-chrome-raised"
      :aria-label="`${siteName}, home`"
    >
      <span class="font-serif text-[1.65rem] leading-none font-semibold" aria-hidden="true">L</span>
    </NuxtLink>

    <nav aria-label="Primary" class="mt-4 flex flex-col items-center gap-1">
      <ChromeRailLink to="/overview" label="Overview">
        <UiIcon name="chart-simple" class="size-5" />
      </ChromeRailLink>

      <ChromeRailLink to="/products" label="Products">
        <UiIcon name="box" class="size-5" />
      </ChromeRailLink>
    </nav>

    <button
      type="button"
      class="mt-auto flex size-10 items-center justify-center rounded-control text-chrome-ink transition-colors hover:bg-chrome-raised hover:text-chrome-ink-strong"
      @click="toggle()"
    >
      <UiIcon name="moon" class="size-[1.15rem] dark:hidden" />
      <span class="sr-only dark:hidden">Switch to dark theme</span>

      <UiIcon name="sun" class="hidden size-[1.15rem] dark:block" />
      <span class="sr-only hidden dark:block">Switch to light theme</span>
    </button>
  </div>
</template>
