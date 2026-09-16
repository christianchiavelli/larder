<script setup lang="ts">
/**
 * The wrapping `<label>` is what makes the row a hit target rather than the
 * sixteen pixels of the box. The native input keeps the platform focus ring and
 * keyboard behaviour, and `accent-color` is enough to style it.
 */
defineProps<{ checked: boolean }>()
defineEmits<{ toggle: [] }>()
</script>

<template>
  <label
    class="flex cursor-pointer items-center gap-2 rounded-control px-1 py-0.5 hover:bg-surface-hover"
  >
    <input
      type="checkbox"
      class="size-4 shrink-0 accent-accent"
      :checked="checked"
      @change="$emit('toggle')"
    />
    <slot />
  </label>
</template>
