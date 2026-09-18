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
 *
 * Solid accent, like every other control that acts on its own here. A neutral
 * disc measured 1.12:1 against the card it floats over in the dark theme, so
 * the shape disappeared and only the arrow was left.
 */
const sentinel = ref<HTMLElement | null>(null)
const { hasNext, goToNext } = useScrollSections(sentinel)
</script>

<template>
  <div ref="sentinel" aria-hidden="true" />

  <Transition
    enter-active-class="transition-opacity"
    leave-active-class="transition-opacity"
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
  >
    <button
      v-if="hasNext"
      type="button"
      class="fixed right-5 bottom-5 z-40 flex size-11 items-center justify-center rounded-full bg-accent text-ink-on-accent shadow-card transition-colors hover:bg-accent-hover sm:right-8 sm:bottom-8"
      @click="goToNext"
    >
      <UiIcon name="arrow-down" class="size-4" />
      <span class="sr-only">Skip to the next section</span>
    </button>
  </Transition>
</template>
