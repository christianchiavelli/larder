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
  <div role="alert" class="reveal flex flex-col items-center gap-5 px-6 py-12 text-center">
    <UiIllustrationUnreachable class="w-44 sm:w-60" data-testid="error-illustration" />

    <div class="flex flex-col items-center gap-1.5">
      <component :is="`h${headingLevel}`" class="text-heading text-ink">{{ title }}</component>
      <p class="max-w-md text-body text-ink-muted">{{ description }}</p>
    </div>

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
  </div>
</template>
