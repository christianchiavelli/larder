<script setup lang="ts">
import { PAGE_SIZES } from '#shared/domain/search'

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
