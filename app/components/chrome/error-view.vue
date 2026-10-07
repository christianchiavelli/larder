<script setup lang="ts">
/**
 * What stands in for a page that could not be shown, centred in the space it
 * left: an address that leads nowhere, with the way back to the catalogue, or a
 * failure, with a retry. Both are the design system's own empty and error states.
 */
const props = withDefaults(
  defineProps<{
    statusCode: number
    path: string
    retrying?: boolean
  }>(),
  { retrying: false },
)

defineEmits<{ retry: [] }>()

const { t } = useI18n()
const localePath = useLocalePath()

const notFound = computed(() => props.statusCode === 404)
</script>

<template>
  <div class="flex flex-1 items-center justify-center px-5 py-10" data-testid="error-view">
    <UiEmptyState v-if="notFound" :heading-level="1" :title="t('errors.notFound.title')">
      <template #description>
        <i18n-t keypath="errors.notFound.description" scope="global">
          <template #path>
            <!-- The address as it was asked for, so a typo in it is easy to spot. -->
            <code
              class="rounded-control bg-surface-sunken px-1 font-mono text-[0.875em] break-words text-ink"
              >{{ path }}</code
            >
          </template>
        </i18n-t>
      </template>

      <div class="flex flex-wrap justify-center gap-2">
        <UiButton :to="localePath('/products')">{{ t('errors.notFound.search') }}</UiButton>
        <UiButton variant="secondary" :to="localePath('/')">{{ t('errors.home') }}</UiButton>
      </div>
    </UiEmptyState>

    <UiErrorState
      v-else
      :heading-level="1"
      :title="t('errors.failed.title')"
      :description="t('errors.failed.description')"
      :retrying="retrying"
      @retry="$emit('retry')"
    >
      <UiButton variant="secondary" :to="localePath('/')">{{ t('errors.home') }}</UiButton>
    </UiErrorState>
  </div>
</template>
