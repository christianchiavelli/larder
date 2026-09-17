<script setup lang="ts">
import { ref } from 'vue'
import { useScrollSections } from '../composables/use-scroll-sections'

/**
 * Steps down a long page one section at a time, and gets out of the way once
 * there is nothing left below.
 *
 * Sections are marked with `data-scroll-section` and set their own
 * `scroll-mt-*`, so a page decides where a section should land. This only
 * decides which one is next.
 *
 * Rendered after the page content, because the sentinel it uses to know it has
 * reached the end has to sit there. The button itself is fixed, so where it
 * appears in the markup is not where it is drawn.
 */
const sentinel = ref<HTMLElement | null>(null)
const { hasNext, goToNext } = useScrollSections(sentinel)
</script>

<template>
  <div ref="sentinel" aria-hidden="true" />

  <Transition
    enter-active-class="transition-opacity motion-reduce:transition-none"
    leave-active-class="transition-opacity motion-reduce:transition-none"
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
  >
    <button
      v-if="hasNext"
      type="button"
      class="fixed right-5 bottom-5 z-40 flex size-11 items-center justify-center rounded-full border border-edge-subtle bg-surface-raised text-ink-muted shadow-card transition-colors hover:border-edge hover:text-ink motion-reduce:transition-none sm:right-8 sm:bottom-8"
      @click="goToNext"
    >
      <UiIcon name="arrow-down" class="size-4" />
      <span class="sr-only">Skip to the next section</span>
    </button>
  </Transition>
</template>
