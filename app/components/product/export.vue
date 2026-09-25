<script setup lang="ts">
import type { ProductSearchResult } from '#shared/domain/search'
import { productExportUrl } from '~/api/products'

defineProps<{
  facets: ProductSearchResult['facets'] | null
}>()

const { query } = useProductQuery()

const open = ref(false)
const href = computed(() => productExportUrl(query.value))

const TRIGGER_CLASSES =
  'inline-flex shrink-0 items-center gap-1.5 text-caption text-ink-accent underline underline-offset-2'
</script>

<template>
  <ClientOnly>
    <button type="button" aria-haspopup="dialog" :class="TRIGGER_CLASSES" @click="open = true">
      <UiIcon name="download" class="size-3" />
      Export CSV
    </button>

    <template #fallback>
      <a :href="href" download :class="TRIGGER_CLASSES">
        <UiIcon name="download" class="size-3" />
        Export CSV
      </a>
    </template>
  </ClientOnly>

  <ProductExportModal v-model:open="open" :facets="facets" />
</template>
