<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    description?: string
    headingLevel?: 1 | 2
  }>(),
  { description: undefined, headingLevel: 2 },
)
</script>

<template>
  <div class="reveal flex flex-col items-center gap-5 px-6 py-12 text-center">
    <slot name="illustration" />

    <div class="flex flex-col items-center gap-1.5">
      <component :is="`h${headingLevel}`" class="text-heading text-ink">{{ title }}</component>
      <p v-if="description" class="max-w-md text-body text-ink-muted">{{ description }}</p>
    </div>

    <slot />
  </div>
</template>
