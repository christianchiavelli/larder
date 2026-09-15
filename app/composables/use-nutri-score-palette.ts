import { NUTRI_SCORE_GRADES } from '#shared/domain/nutrition'

/**
 * The Nutri-Score colours, in the form a canvas can use.
 *
 * Lives in the app rather than in the UI layer because it is a domain fact
 * wearing a colour. The layer knows how to read a colour token and hand it to
 * ECharts; it does not know that a food catalogue grades products from A to E,
 * and the moment it does it stops being a design system.
 *
 * The values themselves stay in tokens.css, as a tier of the palette, because
 * they are values and not types: a stylesheet that declares `--nutriscore-a`
 * has no idea what a grade is.
 */

/** Grades plus the state for a product with no grade on record. */
const PALETTE_KEYS = [...NUTRI_SCORE_GRADES, 'unknown'] as const
type PaletteKey = (typeof PALETTE_KEYS)[number]

const TOKENS = Object.fromEntries(
  PALETTE_KEYS.map((key) => [key, `--nutriscore-${key}`]),
) as Record<PaletteKey, string>

/**
 * Used before styles resolve, on the server and the first client render.
 *
 * A duplicate of the tokens, and unavoidably so: this runs where no stylesheet
 * has been applied. test/app/nutri-score-palette.spec.ts parses the real token
 * file and compares, so the copy cannot drift unnoticed.
 */
export const NUTRI_SCORE_PALETTE_FALLBACK: Record<PaletteKey, string> = {
  a: '#038141',
  b: '#85bb2f',
  c: '#fecb02',
  d: '#ee8100',
  e: '#e63e11',
  unknown: '#cfd3db',
}

export function useNutriScorePalette() {
  return useThemeColors(TOKENS, NUTRI_SCORE_PALETTE_FALLBACK)
}
