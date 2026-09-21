<script setup lang="ts">
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
