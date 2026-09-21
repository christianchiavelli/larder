<script setup lang="ts">
import { ref } from 'vue'
import { useScrollSections } from '../composables/use-scroll-sections'

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
