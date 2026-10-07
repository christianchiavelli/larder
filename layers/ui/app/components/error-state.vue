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

const { t } = useI18n()
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

    <!-- Retrying comes first; whatever else the page offers sits beside it. -->
    <div class="flex flex-wrap justify-center gap-2">
      <UiButton class="disabled:cursor-wait" :disabled="retrying" @click="$emit('retry')">
        <UiSpinner v-if="retrying" class="size-3.5" />
        <UiIcon v-else name="arrow-rotate-right" class="size-3.5" />
        {{ t('ui.errorState.retry') }}
      </UiButton>
      <slot />
    </div>
  </UiIllustratedMessage>
</template>
