<script setup lang="ts">
import {
  NUTRI_SCORE_LABELS,
  NUTRI_SCORE_SHORT_LABELS,
  isUngraded,
  type NutriScore,
} from '#shared/domain/nutrition'

/**
 * Nutri-Score grade badge.
 *
 * Colour alone cannot carry the grade: the scale runs green to red, which is
 * the exact pair a red-green colour deficiency collapses. The letter is always
 * rendered, and the accessible name spells the scale out, so the value survives
 * both colour blindness and a screen reader.
 *
 * The same reasoning decides the two ungraded states. They are different facts,
 * but two neutral greys a step apart measure 1.3:1 against each other, and a
 * difference nobody can see reliably would promise a distinction the colour
 * cannot deliver. So they share a swatch, and the glyph and the name say which.
 */
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

/**
 * A minimum width rather than a fixed one, so the one value that is not a
 * single glyph becomes a pill instead of being clipped.
 *
 * The type scale follows the size and never the content. "N/A" used to step
 * down a scale so the box would grow less, which is the wrong thing to trade:
 * the chips sit in a row together, and a reader reads two type sizes long
 * before anyone notices a box is wider. The step-down bought under two pixels
 * at `sm` and ten at `lg`.
 */
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
