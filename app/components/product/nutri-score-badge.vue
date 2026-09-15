<script setup lang="ts">
import type { NutriScore } from '#shared/domain/nutrition'

/**
 * Nutri-Score grade badge.
 *
 * Colour alone cannot carry the grade: the scale runs green to red, which is
 * the exact pair a red-green colour deficiency collapses. The letter is always
 * rendered, and the accessible name spells the scale out, so the value survives
 * both colour blindness and a screen reader.
 */
const props = withDefaults(
  defineProps<{
    grade: NutriScore
    size?: 'sm' | 'md' | 'lg'
    /** Renders the scale around the grade, for a page that shows one product. */
    showScale?: boolean
  }>(),
  { size: 'md', showScale: false },
)

const GRADE_CLASSES: Record<NutriScore, string> = {
  a: 'bg-nutri-a text-nutri-a-ink',
  b: 'bg-nutri-b text-nutri-b-ink',
  c: 'bg-nutri-c text-nutri-c-ink',
  d: 'bg-nutri-d text-nutri-d-ink',
  e: 'bg-nutri-e text-nutri-e-ink',
  unknown: 'bg-nutri-unknown text-nutri-unknown-ink',
}

const SIZE_CLASSES = {
  sm: 'size-5 text-caption',
  md: 'size-7 text-subheading',
  lg: 'size-10 text-heading',
} as const

const label = computed(() =>
  props.grade === 'unknown'
    ? 'Nutri-Score not available'
    : `Nutri-Score ${props.grade.toUpperCase()}, on a scale from A, best, to E, worst`,
)

const display = computed(() => (props.grade === 'unknown' ? '?' : props.grade.toUpperCase()))
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center rounded-control font-semibold"
    :class="[GRADE_CLASSES[grade], SIZE_CLASSES[size]]"
    role="img"
    :aria-label="label"
  >
    <span aria-hidden="true">{{ display }}</span>
  </span>
</template>
