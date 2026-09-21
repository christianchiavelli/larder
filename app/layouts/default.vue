<template>
  <div class="flex min-h-dvh bg-chrome">
    <a
      href="#main"
      class="skip-link rounded-control bg-accent px-3 py-2 text-label text-ink-on-accent"
    >
      Skip to content
    </a>

    <ChromeRail />

    <div class="ml-rail flex min-w-0 flex-1 flex-col overflow-hidden rounded-tl-shell bg-surface">
      <main id="main" class="flex-1">
        <slot />
        <UiSeeMoreFab />
      </main>

      <ChromeFooter />
    </div>
  </div>
</template>
