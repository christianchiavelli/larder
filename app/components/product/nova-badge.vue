<script setup lang="ts">
import type { NovaGroup } from '#shared/domain/nutrition'

withDefaults(
  defineProps<{
    group: NovaGroup | null
    size?: 'sm' | 'lg'
    withLabel?: boolean
  }>(),
  { size: 'sm', withLabel: false },
)

const GROUP_CLASSES: Record<NovaGroup, string> = {
  1: 'bg-nova-1 text-nova-1-ink',
  2: 'bg-nova-2 text-nova-2-ink',
  3: 'bg-nova-3 text-nova-3-ink',
  4: 'bg-nova-4 text-nova-4-ink',
}

const { t } = useI18n()

const SIZE_CLASSES = {
  sm: 'size-5 text-caption',
  lg: 'size-10 text-heading',
} as const
</script>

<template>
  <span class="inline-flex items-center gap-1.5">
    <span
      class="inline-flex shrink-0 items-center justify-center rounded-full font-semibold"
      :class="[
        SIZE_CLASSES[size],
        group === null ? 'bg-nova-unknown text-nova-unknown-ink' : GROUP_CLASSES[group],
      ]"
      role="img"
      :aria-label="
        group === null
          ? t('nova.unknown')
          : t('nova.described', { group, name: t(`nova.group.${group}`) })
      "
    >
      <span aria-hidden="true">{{ group ?? '?' }}</span>
    </span>
    <span v-if="withLabel" class="text-label text-ink-muted" aria-hidden="true">
      {{ group === null ? t('nova.unknownShort') : t(`nova.short.${group}`) }}
    </span>
  </span>
</template>
