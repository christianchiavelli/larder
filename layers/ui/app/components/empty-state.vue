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
  <UiIllustratedMessage
    role="status"
    :title="title"
    :description="description"
    :heading-level="headingLevel"
  >
    <template #illustration>
      <UiIllustrationNoResults class="w-44 sm:w-60" data-testid="empty-illustration" />
    </template>

    <slot />
  </UiIllustratedMessage>
</template>
