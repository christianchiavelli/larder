<script setup lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

/**
 * Templates name an icon and never import one. Decorative by default; pass
 * `label` only where the icon is the whole control.
 *
 * It sets no display of its own: a leaf that hardcodes one beats the `hidden` a
 * caller passes, which is how the theme toggle drew two icons at once.
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
