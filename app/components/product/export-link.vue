<script setup lang="ts">
import { MAX_TRACKED_HITS } from '#shared/domain/search'
import { productExportUrl } from '~/api/products'

defineProps<{
  exact: boolean
  pending?: boolean
}>()

const { query } = useProductQuery()

const href = computed(() => productExportUrl(query.value))
</script>

<template>
  <a
    :href="pending ? undefined : href"
    :role="pending ? 'link' : undefined"
    :aria-disabled="pending || undefined"
    download
    class="inline-flex shrink-0 items-center gap-1.5 text-caption text-ink-accent underline underline-offset-2 aria-disabled:cursor-default aria-disabled:text-ink-subtle aria-disabled:no-underline"
  >
    <UiIcon name="download" class="size-3" />
    <template v-if="exact">Export CSV</template>
    <template v-else>Export first {{ formatCount(MAX_TRACKED_HITS) }} as CSV</template>
  </a>
</template>
