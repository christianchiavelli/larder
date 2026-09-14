<script setup lang="ts">
const { isDark, toggle } = useTheme()

const NAV = [
  { to: '/', label: 'Overview' },
  { to: '/products', label: 'Products' },
] as const
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <!--
      Lets a keyboard user reach the content without tabbing the whole header.
      Positioned off-screen until focused; see the skip-link utility in ui.css.
    -->
    <a
      href="#main"
      class="skip-link rounded-control bg-accent px-3 py-2 text-label text-ink-on-accent"
    >
      Skip to content
    </a>

    <header
      class="sticky top-0 z-40 h-appbar border-b border-edge-subtle bg-surface-raised/85 backdrop-blur"
    >
      <div class="mx-auto flex h-full max-w-7xl items-center gap-4 px-4 sm:px-6">
        <NuxtLink to="/" class="flex items-center gap-2 text-subheading text-ink">
          <span
            class="inline-flex size-6 items-center justify-center rounded-control bg-accent text-caption font-bold text-ink-on-accent"
            aria-hidden="true"
          >
            L
          </span>
          Larder
        </NuxtLink>

        <nav aria-label="Primary" class="flex items-center gap-1">
          <NuxtLink
            v-for="item in NAV"
            :key="item.to"
            :to="item.to"
            class="rounded-control px-2.5 py-1.5 text-label text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink motion-reduce:transition-none"
            active-class="bg-surface-accent text-ink-accent"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>

        <button
          type="button"
          class="ml-auto rounded-control border border-edge-subtle p-1.5 text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink motion-reduce:transition-none"
          :aria-pressed="isDark"
          :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
          @click="toggle()"
        >
          <svg
            class="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <template v-if="isDark">
              <circle cx="12" cy="12" r="4" />
              <path
                d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
              />
            </template>
            <path v-else d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
          </svg>
        </button>
      </div>
    </header>

    <main id="main" class="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <slot />
    </main>

    <footer class="border-t border-edge-subtle px-4 py-6 sm:px-6">
      <div
        class="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-1 text-caption text-ink-subtle"
      >
        <span>Data from</span>
        <a
          href="https://world.openfoodfacts.org"
          target="_blank"
          rel="noopener noreferrer"
          class="text-ink-muted underline underline-offset-2 hover:text-ink"
        >
          Open Food Facts
        </a>
        <span
          >, licensed under ODbL. Product information is contributed by the public and may be
          incomplete.</span
        >
      </div>
    </footer>
  </div>
</template>
