import type { NutriScore } from '#shared/domain/nutrition'

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

/**
 * Both ungraded states read from one token.
 *
 * Not an oversight: they are different facts, and the axis label and the badge
 * glyph say which, but two neutral greys a step apart measure 1.3:1 against
 * each other. Colouring them separately would claim a distinction the eye
 * cannot make, so here the colour means only "no grade".
 */
const TOKENS: Record<NutriScore, string> = {
  a: '--nutriscore-a',
  b: '--nutriscore-b',
  c: '--nutriscore-c',
  d: '--nutriscore-d',
  e: '--nutriscore-e',
  unknown: '--nutriscore-ungraded',
  'not-applicable': '--nutriscore-ungraded',
}

/**
 * Used before styles resolve, on the server and the first client render.
 *
 * A duplicate of the tokens, and unavoidably so: this runs where no stylesheet
 * has been applied. test/app/nutri-score-palette.spec.ts parses the real token
 * file and compares, so the copy cannot drift unnoticed.
 */
export const NUTRI_SCORE_PALETTE_FALLBACK: Record<NutriScore, string> = {
  a: '#038141',
  b: '#85bb2f',
  c: '#fecb02',
  d: '#ee8100',
  e: '#e63e11',
  unknown: '#cfd3db',
  'not-applicable': '#cfd3db',
}

export { TOKENS as NUTRI_SCORE_PALETTE_TOKENS }

export function useNutriScorePalette() {
  return useThemeColors(TOKENS, NUTRI_SCORE_PALETTE_FALLBACK)
}
