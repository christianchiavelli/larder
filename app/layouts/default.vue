<script setup lang="ts">
const { toggle } = useTheme()
const { siteName } = useRuntimeConfig().public
</script>

<template>
  <div class="flex min-h-dvh bg-surface">
    <a
      href="#main"
      class="skip-link rounded-control bg-accent px-3 py-2 text-label text-ink-on-accent"
    >
      Skip to content
    </a>

    <!--
      Navigation rail.

      Dark in both themes, because its job is to frame the content and give the
      page an edge. A light rail against a light page is a divider, not a frame.
    -->
    <div
      class="fixed inset-y-0 left-0 z-40 flex w-rail flex-col items-center border-r border-chrome-edge bg-chrome py-3"
    >
      <NuxtLink
        to="/"
        class="flex size-10 items-center justify-center rounded-control text-chrome-ink-strong transition-colors hover:bg-chrome-raised motion-reduce:transition-none"
        :aria-label="`${siteName}, home`"
      >
        <!--
          The mark is the letterform itself, set in the same serif as every
          heading. A glyph in a rounded coloured square is the house style of
          software that has no house style.
        -->
        <span class="font-serif text-[1.65rem] leading-none font-semibold" aria-hidden="true"
          >L</span
        >
      </NuxtLink>

      <nav aria-label="Primary" class="mt-4 flex flex-col items-center gap-1">
        <AppRailLink to="/" label="Overview">
          <svg
            class="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M4 19V11M9.33 19V5M14.67 19v-6M20 19V8" />
          </svg>
        </AppRailLink>

        <AppRailLink to="/products" label="Products">
          <svg
            class="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" />
            <path d="M3.5 7.5 12 12m0 9v-9m8.5-4.5L12 12" />
          </svg>
        </AppRailLink>
      </nav>

      <!--
        Both icons are rendered and CSS picks one.

        The server cannot know the visitor's theme: the preference lives in
        their localStorage. Branching on `isDark` here therefore renders the
        moon on the server and, for anyone using dark mode, the sun on the
        client, which is a hydration mismatch that only that half of users ever
        hits. Vue then discards and re-renders the subtree.

        The inline bootstrap script has already put `.dark` on <html> before
        first paint, so the `dark:` variants resolve correctly in the very first
        frame with no JavaScript involved. `display: none` also removes an icon
        from the accessibility tree, which is what lets each one carry its own
        label without a screen reader announcing both.
      -->
      <button
        type="button"
        class="mt-auto flex size-10 items-center justify-center rounded-control text-chrome-ink transition-colors hover:bg-chrome-raised hover:text-chrome-ink-strong motion-reduce:transition-none"
        @click="toggle()"
      >
        <svg
          class="size-[1.15rem] dark:hidden"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
        <span class="sr-only dark:hidden">Switch to dark theme</span>

        <svg
          class="hidden size-[1.15rem] dark:block"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4.2" />
          <path
            d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"
          />
        </svg>
        <span class="sr-only hidden dark:block">Switch to light theme</span>
      </button>
    </div>

    <div class="flex min-w-0 flex-1 flex-col pl-rail">
      <main id="main" class="flex-1 px-5 py-7 sm:px-8 sm:py-9">
        <div class="mx-auto w-full max-w-[86rem]">
          <slot />
        </div>
      </main>

      <footer class="border-t border-edge-subtle px-5 py-5 sm:px-8">
        <div
          class="mx-auto flex max-w-[86rem] flex-wrap items-baseline gap-x-2 gap-y-1 text-caption text-ink-subtle"
        >
          <span class="font-serif text-label font-semibold text-ink-muted">{{ siteName }}</span>
          <span aria-hidden="true">·</span>
          <span>Data from</span>
          <a
            href="https://world.openfoodfacts.org"
            target="_blank"
            rel="noopener noreferrer"
            class="text-ink-muted underline decoration-edge-strong underline-offset-2 hover:text-ink-accent hover:decoration-current"
          >
            Open Food Facts
          </a>
          <span>under ODbL. Records are contributed by the public and may be incomplete.</span>
        </div>
      </footer>
    </div>
  </div>
</template>
