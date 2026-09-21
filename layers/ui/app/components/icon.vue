<script setup lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

defineProps<{
  name: IconName
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
