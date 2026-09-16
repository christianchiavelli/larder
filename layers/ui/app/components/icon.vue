<script setup lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

/**
 * The single seam between this product and the icon library.
 *
 * Templates name an icon and never import one, so swapping the library is a
 * change to two files rather than to every component that draws something.
 *
 * Decorative by default: an icon beside a label repeats it to a screen reader.
 * Pass `label` only where the icon is the whole control.
 *
 * It sets no display of its own. A leaf that hardcodes one wins the cascade
 * against the `hidden` a caller passes, which is how the theme toggle came to
 * draw a sun and a moon at the same time.
 */
defineProps<{
  name: IconName
  /** Accessible name. Omit when a visible label already carries the meaning. */
  label?: string
}>()
</script>

<template>
  <FontAwesomeIcon
    :icon="ICONS[name]"
    :aria-hidden="label ? undefined : true"
    :aria-label="label"
    :role="label ? 'img' : undefined"
  />
</template>
