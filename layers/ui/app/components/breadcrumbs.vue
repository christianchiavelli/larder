<script setup lang="ts">
export type BreadcrumbItem = {
  text: string
  to?: string
}

defineProps<{ items: BreadcrumbItem[] }>()
</script>

<template>
  <nav aria-label="Breadcrumb" class="min-w-0 text-label">
    <ol class="flex min-w-0 flex-wrap items-center gap-1.5">
      <li v-for="(item, index) in items" :key="index" class="flex min-w-0 items-center gap-1.5">
        <NuxtLink
          v-if="item.to && index < items.length - 1"
          :to="item.to"
          class="shrink-0 text-ink-accent hover:underline hover:underline-offset-2"
        >
          {{ item.text }}
        </NuxtLink>

        <span v-else class="truncate font-bold text-ink" aria-current="page">
          {{ item.text }}
        </span>

        <UiIcon
          v-if="index < items.length - 1"
          name="chevron-right"
          class="size-2 shrink-0 text-ink-subtle"
        />
      </li>
    </ol>
  </nav>
</template>
