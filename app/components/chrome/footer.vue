<script setup lang="ts">
const { siteName } = useRuntimeConfig().public
</script>

<template>
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
</template>
