<script setup lang="ts">
import { PAGE_SIZES } from '#shared/domain/search'

/**
 * How many rows a page holds.
 *
 * The URL already carried `pageSize`, the schema already validated it against
 * the offered sizes, and the composable already reset to page one when it
 * changed. The control was the missing piece, so the only way to read more than
 * twenty-four rows was to edit the address bar.
 *
 * Sizes stop at 96 deliberately. The list is not virtualised, and a page of a
 * thousand rows would be a thousand real DOM nodes and a thousand image
 * requests for a scroll almost nobody finishes.
 */
const { query, setPageSize } = useProductQuery()

const value = computed<number>({
  get: () => query.value.pageSize,
  set: (size) => {
    setPageSize(size)
  },
})

const options = PAGE_SIZES.map((size) => ({ value: size, label: String(size) }))
</script>

<template>
  <UiSelectField v-model="value" label="Per page" :options="options" />
</template>
