<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    description: string
    retrying?: boolean
    headingLevel?: 1 | 2
  }>(),
  { retrying: false, headingLevel: 2 },
)

defineEmits<{ retry: [] }>()
</script>

<template>
  <UiIllustratedMessage
    role="alert"
    :title="title"
    :description="description"
    :heading-level="headingLevel"
  >
    <template #illustration>
      <UiIllustrationUnreachable class="w-44 sm:w-60" data-testid="error-illustration" />
    </template>

    <button
      type="button"
      class="inline-flex h-9 items-center justify-center gap-2 rounded-control bg-accent px-4 text-label text-ink-on-accent transition-colors hover:bg-accent-hover disabled:cursor-wait"
      :disabled="retrying"
      @click="$emit('retry')"
    >
      <UiSpinner v-if="retrying" class="size-3.5" />
      <UiIcon v-else name="arrow-rotate-right" class="size-3.5" />
      Try again
    </button>
  </UiIllustratedMessage>
</template>
