import { z } from 'zod'

/**
 * Nutrition vocabulary.
 *
 * These are domain facts, not API shapes. Open Food Facts happens to be where
 * we read them from today, but Nutri-Score and NOVA are defined by public
 * health bodies and would mean the same thing sourced from anywhere else.
 */

/** Nutri-Score front-of-pack grade, A (best) through E. */
export const NUTRI_SCORE_GRADES = ['a', 'b', 'c', 'd', 'e'] as const
export type NutriScoreGrade = (typeof NUTRI_SCORE_GRADES)[number]

/**
 * Why a product carries no grade.
 *
 * Two facts, not one absence. `unknown` is a product nobody has graded yet, and
 * it may well carry a letter tomorrow: what is missing is the data.
 * `not-applicable` is a product the scheme excludes by design, such as a beer,
 * a wine or a vinegar, and no amount of community editing will ever give it
 * one.
 *
 * Together they are two thirds of the catalogue, and upstream reports them as
 * separate buckets. Folding them into a single absence throws away the only
 * thing that tells a gap in the data apart from a deliberate exclusion, which
 * is also the difference between "nobody has looked at this yet" and "there is
 * nothing to look at".
 */
export const UNGRADED_REASONS = ['unknown', 'not-applicable'] as const
export type UngradedReason = (typeof UNGRADED_REASONS)[number]

/**
 * Every value a Nutri-Score takes, which is also everything the directory can
 * filter by. One vocabulary, so a filter cannot ask for something a product
 * cannot be.
 */
export const NUTRI_SCORE_VALUES = [...NUTRI_SCORE_GRADES, ...UNGRADED_REASONS] as const

export const nutriScoreSchema = z.enum(NUTRI_SCORE_VALUES)
export type NutriScore = z.infer<typeof nutriScoreSchema>

/** What fits in a badge or on a chart axis, where there is room for a glyph. */
export const NUTRI_SCORE_SHORT_LABELS: Record<NutriScore, string> = {
  a: 'A',
  b: 'B',
  c: 'C',
  d: 'D',
  e: 'E',
  unknown: '?',
  'not-applicable': 'N/A',
}

/** What goes in a tooltip, a data table or an accessible name. */
export const NUTRI_SCORE_LABELS: Record<NutriScore, string> = {
  a: 'Grade A',
  b: 'Grade B',
  c: 'Grade C',
  d: 'Grade D',
  e: 'Grade E',
  unknown: 'Not reported',
  'not-applicable': 'Not applicable',
}

/** True for a value that is an absence rather than a grade. */
export function isUngraded(value: NutriScore): value is UngradedReason {
  return (UNGRADED_REASONS as readonly string[]).includes(value)
}

/** NOVA food processing classification, 1 (unprocessed) through 4 (ultra-processed). */
export const NOVA_GROUPS = [1, 2, 3, 4] as const
export type NovaGroup = (typeof NOVA_GROUPS)[number]

export const novaGroupSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])

/**
 * How the directory asks for a product with no NOVA group.
 *
 * Three quarters of the catalogue has none, and unlike a missing Nutri-Score
 * the index does not spell it: the field is simply absent, so there is no
 * bucket in the facet and nothing to select by value. This token stands for
 * that absence in a URL, and the query builder turns it into the only thing
 * that can express it, a negation.
 *
 * Deliberately not a NOVA group. A product without one is not in a fifth
 * category of processing, it is unclassified, and the two must not read as the
 * same kind of answer.
 */
export const NOVA_UNGROUPED = 'none'
export type NovaUngrouped = typeof NOVA_UNGROUPED

/** Everything the processing filter offers: the four groups, plus their absence. */
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
 * What the processing filter shows beside each control.
 *
 * "Not classified" rather than "Unknown", which is what the badge says for a
 * product. The badge is reporting what is on record for one item; the filter is
 * naming a population, and three quarters of the catalogue being "unknown"
 * reads as a fault in the page rather than a fact about the data.
 */
export const NOVA_FILTER_LABELS: Record<NovaFilterValue, string> = {
  ...NOVA_SHORT_LABELS,
  [NOVA_UNGROUPED]: 'Not classified',
}

/**
 * The nutrients we model, keyed the way the domain names them rather than the
 * way upstream serialises them.
 *
 * Every value is per 100g or 100ml. Upstream also exposes per-serving figures,
 * but serving sizes are free text and frequently missing, so per-100 is the
 * only basis on which two products can honestly be compared. That constraint is
 * why the unit lives in the descriptor below and not on each reading.
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
  /** Unit of the per-100 value. */
  unit: 'kcal' | 'g'
  /** Decimal places to render. Salt is dosed far below one gram, so it needs two. */
  precision: number
  /**
   * Reference intake per EU Regulation 1169/2011 Annex XIII, for an average
   * adult on 8400 kJ / 2000 kcal. Absent where the regulation sets none.
   */
  referenceIntake?: number
  /**
   * Whether more of this nutrient reads as better. Drives which end of a
   * comparison chart is coloured as favourable, and nothing else: the app does
   * not tell anyone what to eat.
   */
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
 * A nutrient reading is nullable per nutrient, not per product: a product can
 * declare sugars and omit fibre. Collapsing that into a single "has nutrition"
 * flag would force the UI to render zeroes it cannot vouch for.
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

/** How many of the modelled nutrients this product actually declares. */
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
