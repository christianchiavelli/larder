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
  <div
    class="flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-edge bg-surface-sunken px-6 py-12 text-center"
    role="status"
  >
    <component :is="`h${headingLevel}`" class="text-subheading text-ink">
      {{ title }}
    </component>

    <p v-if="description" class="max-w-prose text-body text-ink-muted">
      {{ description }}
    </p>

    <slot />
  </div>
</template>
