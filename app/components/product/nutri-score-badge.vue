<script setup lang="ts">
import {
  NUTRI_SCORE_LABELS,
  NUTRI_SCORE_SHORT_LABELS,
  isUngraded,
  type NutriScore,
} from '#shared/domain/nutrition'

const props = withDefaults(
  defineProps<{
    grade: NutriScore
    size?: 'sm' | 'md' | 'lg'
  }>(),
  { size: 'md' },
)

const CHIP_CLASSES: Record<NutriScore, string> = {
  a: 'bg-nutri-a text-nutri-a-ink',
  b: 'bg-nutri-b text-nutri-b-ink',
  c: 'bg-nutri-c text-nutri-c-ink',
  d: 'bg-nutri-d text-nutri-d-ink',
  e: 'bg-nutri-e text-nutri-e-ink',
  unknown: 'bg-nutri-ungraded text-nutri-ungraded-ink',
  'not-applicable': 'bg-nutri-ungraded text-nutri-ungraded-ink',
}

const SIZE_CLASSES = {
  sm: 'h-5 min-w-5 text-caption',
  md: 'h-7 min-w-7 text-subheading',
  lg: 'h-10 min-w-10 text-heading',
} as const

const display = computed(() => NUTRI_SCORE_SHORT_LABELS[props.grade])

const label = computed(() =>
  isUngraded(props.grade)
    ? `Nutri-Score ${NUTRI_SCORE_LABELS[props.grade].toLowerCase()}`
    : `Nutri-Score ${props.grade.toUpperCase()}, on a scale from A, best, to E, worst`,
)
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center rounded-control px-1 font-semibold"
    :class="[CHIP_CLASSES[grade], SIZE_CLASSES[size]]"
    role="img"
    :aria-label="label"
  >
    <span aria-hidden="true">{{ display }}</span>
  </span>
</template>
