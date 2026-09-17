<script setup lang="ts">
const { toggle } = useTheme()
const { siteName } = useRuntimeConfig().public
</script>

<template>
  <div class="flex min-h-dvh bg-chrome">
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
    <div class="fixed inset-y-0 left-0 z-40 flex w-rail flex-col items-center bg-chrome py-3">
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
        <ChromeRailLink to="/" label="Overview">
          <UiIcon name="chart-simple" class="size-5" />
        </ChromeRailLink>

        <ChromeRailLink to="/products" label="Products">
          <UiIcon name="box" class="size-5" />
        </ChromeRailLink>
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
        <UiIcon name="moon" class="size-[1.15rem] dark:hidden" />
        <span class="sr-only dark:hidden">Switch to dark theme</span>

        <UiIcon name="sun" class="hidden size-[1.15rem] dark:block" />
        <span class="sr-only hidden dark:block">Switch to light theme</span>
      </button>
    </div>

    <!--
      The page is a panel laid on the chrome, rounded where the two meet.

      That corner is why this is a margin and not padding: a rounded edge needs
      something behind it to round against, and with `pl-rail` the panel would
      be rounding against its own background.
    -->
    <div class="ml-rail flex min-w-0 flex-1 flex-col rounded-tl-shell bg-surface">
      <main id="main" class="flex-1 px-5 py-7 sm:px-8 sm:py-9">
        <div class="mx-auto w-full max-w-[86rem]">
          <slot />
          <UiSeeMoreFab />
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
