<script setup lang="ts">
/**
 * A checkbox and whatever goes beside it, as one clickable row.
 *
 * The chrome is the whole point: the wrapping `<label>` is what makes the row
 * a hit target rather than the sixteen pixels of the box itself, and the
 * native input is kept because `accent-color` styles it without giving up the
 * platform's own focus ring, keyboard behaviour or indeterminate state.
 *
 * Extracted because two filter lists were carrying the same decisions in
 * duplicate, which is how one of them ends up with a different hit area after
 * someone adjusts the other.
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
