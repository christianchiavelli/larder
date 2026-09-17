<script setup lang="ts">
import { useElementVisibility } from '@vueuse/core'
import { ref } from 'vue'

/**
 * A dark banner with two colour fields drifting behind the content.
 *
 * The colours come from the semantic tokens, not from `--color-*`: `@theme
 * inline` writes those into the generated utilities rather than onto `:root`,
 * so reading one here resolves to nothing and takes the whole gradient with
 * it. e2e/design-tokens.spec.ts asserts the field still paints.
 *
 * The animation is paused while the banner is off screen. It is two composited
 * transforms rather than an animated filter or gradient, so the cost is small
 * either way, but a page left open on another tab has no reason to keep a
 * compositor layer ticking.
 *
 * Dark in both themes, like the rail: this is chrome the page is laid on, and
 * it has to read as the same surface the rail is part of.
 */
const banner = ref<HTMLElement | null>(null)
const isVisible = useElementVisibility(banner)
</script>

<template>
  <div
    ref="banner"
    class="relative isolate overflow-hidden rounded-card bg-chrome px-6 py-12 sm:px-10 sm:py-16"
  >
    <!--
      Decorative, and deliberately unreachable: the fields carry no information
      the text below does not already state.
    -->
    <div aria-hidden="true" class="pointer-events-none absolute inset-0 -z-10">
      <div
        class="drift-field absolute -top-[30%] left-[2%] size-[26rem] opacity-55 [--drift-color:var(--accent-solid)] motion-safe:animate-drift-near"
        :class="{ 'motion-safe:[animation-play-state:paused]': !isVisible }"
      />
      <div
        class="drift-field absolute -bottom-[35%] right-[4%] size-[24rem] opacity-40 [--drift-color:var(--viz-3)] motion-safe:animate-drift-far"
        :class="{ 'motion-safe:[animation-play-state:paused]': !isVisible }"
      />
    </div>

    <div class="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
      <slot />
    </div>
  </div>
</template>
