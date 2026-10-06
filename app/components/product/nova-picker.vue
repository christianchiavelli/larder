<script setup lang="ts">
import { NOVA_FILTER_VALUES, NOVA_UNGROUPED, type NovaFilterValue } from '#shared/domain/nutrition'

defineProps<{ selected: readonly NovaFilterValue[] }>()
defineEmits<{ toggle: [group: NovaFilterValue] }>()

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-wrap gap-1.5">
    <button
      v-for="group in NOVA_FILTER_VALUES"
      :key="group"
      type="button"
      class="inline-flex rounded-pill border p-1 transition-colors"
      :class="
        selected.includes(group)
          ? 'border-edge-selected bg-surface-selected'
          : 'border-transparent hover:bg-surface-hover'
      "
      :aria-pressed="selected.includes(group)"
      :aria-label="t(`nova.short.${group}`)"
      :title="t(`nova.short.${group}`)"
      @click="$emit('toggle', group)"
    >
      <ProductNovaBadge :group="group === NOVA_UNGROUPED ? null : group" />
    </button>
  </div>
</template>
