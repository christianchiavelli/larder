import { z } from 'zod'

/**
 * Domain facts, not API shapes: Nutri-Score and NOVA are defined by public
 * health bodies and mean the same thing sourced from anywhere else.
 */

/** Front-of-pack grade, A (best) through E. */
export const NUTRI_SCORE_GRADES = ['a', 'b', 'c', 'd', 'e'] as const
export type NutriScoreGrade = (typeof NUTRI_SCORE_GRADES)[number]

/**
 * Two facts, not one absence: `unknown` is a product nobody has graded yet,
 * `not-applicable` one the scheme excludes by design, such as a beer or a
 * vinegar. Upstream reports them separately and together they are two thirds of
 * the catalogue, so folding them loses a data gap against a deliberate
 * exclusion.
 */
export const UNGRADED_REASONS = ['unknown', 'not-applicable'] as const
export type UngradedReason = (typeof UNGRADED_REASONS)[number]

/** One vocabulary, so a filter cannot ask for something a product cannot be. */
export const NUTRI_SCORE_VALUES = [...NUTRI_SCORE_GRADES, ...UNGRADED_REASONS] as const

export const nutriScoreSchema = z.enum(NUTRI_SCORE_VALUES)
export type NutriScore = z.infer<typeof nutriScoreSchema>

/** For a badge or a chart axis, where there is room for a glyph. */
export const NUTRI_SCORE_SHORT_LABELS: Record<NutriScore, string> = {
  a: 'A',
  b: 'B',
  c: 'C',
  d: 'D',
  e: 'E',
  unknown: '?',
  'not-applicable': 'N/A',
}

export const NUTRI_SCORE_LABELS: Record<NutriScore, string> = {
  a: 'Grade A',
  b: 'Grade B',
  c: 'Grade C',
  d: 'Grade D',
  e: 'Grade E',
  unknown: 'Not reported',
  'not-applicable': 'Not applicable',
}

export function isUngraded(value: NutriScore): value is UngradedReason {
  return (UNGRADED_REASONS as readonly string[]).includes(value)
}

/** Food processing classification, 1 (unprocessed) to 4 (ultra-processed). */
export const NOVA_GROUPS = [1, 2, 3, 4] as const
export type NovaGroup = (typeof NOVA_GROUPS)[number]

export const novaGroupSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])

/**
 * Three quarters of the catalogue has no group, and unlike a missing
 * Nutri-Score the index does not spell it: the field is absent, so there is no
 * bucket to select and the query builder has to negate instead. Not a fifth
 * group, since an unclassified product is not a kind of processing.
 */
export const NOVA_UNGROUPED = 'none'
export type NovaUngrouped = typeof NOVA_UNGROUPED

export const NOVA_FILTER_VALUES = [...NOVA_GROUPS, NOVA_UNGROUPED] as const
export type NovaFilterValue = (typeof NOVA_FILTER_VALUES)[number]

export const novaFilterValueSchema = z.union([novaGroupSchema, z.literal(NOVA_UNGROUPED)])

export const NOVA_LABELS: Record<NovaGroup, string> = {
  1: 'Unprocessed or minimally processed',
  2: 'Processed culinary ingredient',
  3: 'Processed food',
  4: 'Ultra-processed food',
}

export const NOVA_SHORT_LABELS: Record<NovaGroup, string> = {
  1: 'Unprocessed',
  2: 'Culinary ingredient',
  3: 'Processed',
  4: 'Ultra-processed',
}

/**
 * "Not classified" rather than the badge's "Unknown": the badge reports one
 * item, the filter names a population, and three quarters of a catalogue being
 * unknown reads as a fault in the page.
 */
export const NOVA_FILTER_LABELS: Record<NovaFilterValue, string> = {
  ...NOVA_SHORT_LABELS,
  [NOVA_UNGROUPED]: 'Not classified',
}

/**
 * Per 100g or 100ml throughout. Upstream also exposes per-serving figures, but
 * serving sizes are free text and often missing, so per-100 is the only basis
 * on which two products compare honestly.
 */
export const NUTRIENT_KEYS = [
  'energyKcal',
  'fat',
  'saturatedFat',
  'carbohydrates',
  'sugars',
  'fiber',
  'proteins',
  'salt',
  'sodium',
] as const

export type NutrientKey = (typeof NUTRIENT_KEYS)[number]

export interface NutrientDescriptor {
  key: NutrientKey
  label: string
  unit: 'kcal' | 'g'
  /** Salt is dosed far below a gram, so it needs two places. */
  precision: number
  /** EU Regulation 1169/2011 Annex XIII, adult on 2000 kcal. Absent where unset. */
  referenceIntake?: number
  /** Drives which end of a comparison chart reads as favourable, nothing more. */
  direction: 'higher-is-better' | 'lower-is-better' | 'neutral'
}

export const NUTRIENTS: Record<NutrientKey, NutrientDescriptor> = {
  energyKcal: {
    key: 'energyKcal',
    label: 'Energy',
    unit: 'kcal',
    precision: 0,
    referenceIntake: 2000,
    direction: 'neutral',
  },
  fat: {
    key: 'fat',
    label: 'Fat',
    unit: 'g',
    precision: 1,
    referenceIntake: 70,
    direction: 'lower-is-better',
  },
  saturatedFat: {
    key: 'saturatedFat',
    label: 'Saturated fat',
    unit: 'g',
    precision: 1,
    referenceIntake: 20,
    direction: 'lower-is-better',
  },
  carbohydrates: {
    key: 'carbohydrates',
    label: 'Carbohydrates',
    unit: 'g',
    precision: 1,
    referenceIntake: 260,
    direction: 'neutral',
  },
  sugars: {
    key: 'sugars',
    label: 'Sugars',
    unit: 'g',
    precision: 1,
    referenceIntake: 90,
    direction: 'lower-is-better',
  },
  fiber: {
    key: 'fiber',
    label: 'Fibre',
    unit: 'g',
    precision: 1,
    direction: 'higher-is-better',
  },
  proteins: {
    key: 'proteins',
    label: 'Protein',
    unit: 'g',
    precision: 1,
    referenceIntake: 50,
    direction: 'higher-is-better',
  },
  salt: {
    key: 'salt',
    label: 'Salt',
    unit: 'g',
    precision: 2,
    referenceIntake: 6,
    direction: 'lower-is-better',
  },
  sodium: {
    key: 'sodium',
    label: 'Sodium',
    unit: 'g',
    precision: 3,
    direction: 'lower-is-better',
  },
}

/**
 * Nullable per nutrient, not per product: a product can declare sugars and omit
 * fibre, and one "has nutrition" flag would mean rendering zeroes we cannot
 * vouch for.
 */
export const nutrientProfileSchema = z.object({
  energyKcal: z.number().nullable(),
  fat: z.number().nullable(),
  saturatedFat: z.number().nullable(),
  carbohydrates: z.number().nullable(),
  sugars: z.number().nullable(),
  fiber: z.number().nullable(),
  proteins: z.number().nullable(),
  salt: z.number().nullable(),
  sodium: z.number().nullable(),
})

export type NutrientProfile = z.infer<typeof nutrientProfileSchema>

export const EMPTY_NUTRIENT_PROFILE: NutrientProfile = {
  energyKcal: null,
  fat: null,
  saturatedFat: null,
  carbohydrates: null,
  sugars: null,
  fiber: null,
  proteins: null,
  salt: null,
  sodium: null,
}

export function declaredNutrientCount(profile: NutrientProfile): number {
  return NUTRIENT_KEYS.reduce((total, key) => (profile[key] === null ? total : total + 1), 0)
}

/**
 * Share of an adult reference intake covered by 100g of the product, as a
 * fraction. Returns null when the nutrient has no regulated reference value,
 * which is the honest answer for fibre and sodium.
 */
export function referenceIntakeShare(key: NutrientKey, value: number | null): number | null {
  const reference = NUTRIENTS[key].referenceIntake
  if (value === null || reference === undefined) return null
  return value / reference
}
