import { z } from 'zod'

export const NUTRI_SCORE_GRADES = ['a', 'b', 'c', 'd', 'e'] as const
export type NutriScoreGrade = (typeof NUTRI_SCORE_GRADES)[number]

export const UNGRADED_REASONS = ['unknown', 'not-applicable'] as const
export type UngradedReason = (typeof UNGRADED_REASONS)[number]

export const NUTRI_SCORE_VALUES = [...NUTRI_SCORE_GRADES, ...UNGRADED_REASONS] as const

export const nutriScoreSchema = z.enum(NUTRI_SCORE_VALUES)
export type NutriScore = z.infer<typeof nutriScoreSchema>

export function isUngraded(value: NutriScore): value is UngradedReason {
  return (UNGRADED_REASONS as readonly string[]).includes(value)
}

export const NOVA_GROUPS = [1, 2, 3, 4] as const
export type NovaGroup = (typeof NOVA_GROUPS)[number]

export const novaGroupSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])

export const NOVA_UNGROUPED = 'none'
export type NovaUngrouped = typeof NOVA_UNGROUPED

export const NOVA_FILTER_VALUES = [...NOVA_GROUPS, NOVA_UNGROUPED] as const
export type NovaFilterValue = (typeof NOVA_FILTER_VALUES)[number]

export const novaFilterValueSchema = z.union([novaGroupSchema, z.literal(NOVA_UNGROUPED)])

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
  /** The name the CSV export heads its column with, in English whatever the page's language. */
  label: string
  unit: 'kcal' | 'g'
  precision: number
  referenceIntake?: number
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

export function referenceIntakeShare(key: NutrientKey, value: number | null): number | null {
  const reference = NUTRIENTS[key].referenceIntake
  if (value === null || reference === undefined) return null
  return value / reference
}
