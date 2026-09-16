<script setup lang="ts">
/**
 * What fills a picture's place when there is no picture.
 *
 * A filled tile with a muted glyph rather than an empty outline: an empty box
 * reads as an image that failed to load, and this one did not fail, it does not
 * exist. Filling the tile is what says the emptiness was on purpose.
 *
 * One component for every size, because a list and a detail page were answering
 * the same question two different ways, one with a shape and one with the words
 * "No image". Text in a slot reserved for a picture is a caption for something
 * that is not there.
 */
withDefaults(
  defineProps<{
    size?: 'sm' | 'lg'
    /** Omit where a name beside the tile already says which product this is. */
    label?: string
  }>(),
  { size: 'sm' },
)

const GLYPH_SIZE = { sm: 'size-4', lg: 'size-7' } as const
</script>

<template>
  <span
    class="flex size-full items-center justify-center bg-surface-sunken text-ink-subtle"
    :aria-hidden="label ? undefined : true"
    :aria-label="label"
    :role="label ? 'img' : undefined"
  >
    <UiIcon name="image" :class="GLYPH_SIZE[size]" />
  </span>
</template>
