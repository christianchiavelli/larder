<script setup lang="ts">
export type BreadcrumbItem = {
  text: string
  to?: string
}

defineProps<{ items: BreadcrumbItem[] }>()

const { t } = useI18n()
</script>

<template>
  <nav :aria-label="t('ui.breadcrumb')" class="min-w-0 text-label">
    <!--
      One line however long the page's name: the steps above keep their width, and the name is
      cut short instead of dropping below them.
    -->
    <ol class="flex min-w-0 items-center gap-1.5">
      <li
        v-for="(item, index) in items"
        :key="index"
        class="flex items-center gap-1.5"
        :class="index < items.length - 1 ? 'shrink-0' : 'min-w-0'"
      >
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
