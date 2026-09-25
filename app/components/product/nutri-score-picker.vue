<script setup lang="ts">
import { NUTRI_SCORE_VALUES, type NutriScore } from '#shared/domain/nutrition'

defineProps<{ selected: readonly NutriScore[] }>()
defineEmits<{ toggle: [grade: NutriScore] }>()
</script>

<template>
  <div class="flex flex-wrap gap-1.5">
    <button
      v-for="grade in NUTRI_SCORE_VALUES"
      :key="grade"
      type="button"
      class="inline-flex rounded-control-frame border p-1 transition-colors"
      :class="
        selected.includes(grade)
          ? 'border-edge-selected bg-surface-selected'
          : 'border-transparent hover:bg-surface-hover'
      "
      :aria-pressed="selected.includes(grade)"
      @click="$emit('toggle', grade)"
    >
      <ProductNutriScoreBadge :grade="grade" size="sm" />
    </button>
  </div>
</template>
