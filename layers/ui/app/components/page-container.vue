<script setup lang="ts">
/**
 * The measure and the gutters every page reads at.
 *
 * Applied by the page rather than by the layout, so a page can put something
 * outside it. A banner constrained to the text measure is a card with a
 * picture in it; one that reaches both edges of the panel is a banner.
 */
</script>

<template>
  <div class="mx-auto w-full max-w-[86rem] px-5 py-7 sm:px-8 sm:py-9">
    <slot />
  </div>
</template>
