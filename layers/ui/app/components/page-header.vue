<script setup lang="ts">
/**
 * Serif title over sans supporting text. `actions` drops below the title on
 * narrow screens rather than shrinking it.
 */
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <header class="mb-6 flex flex-col gap-4">
    <div v-if="$slots.eyebrow">
      <slot name="eyebrow" />
    </div>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div class="flex min-w-0 flex-col gap-1.5">
        <h1 class="text-title text-ink">{{ title }}</h1>
        <p v-if="description" class="max-w-prose text-body text-ink-muted">
          {{ description }}
        </p>
      </div>

      <div v-if="$slots.actions" class="flex shrink-0 items-center gap-2">
        <slot name="actions" />
      </div>
    </div>

    <slot />
  </header>
</template>
