import type { NutriScore } from '#shared/domain/nutrition'

/**
 * In the app rather than the UI layer: the layer reads colour tokens, it does not
 * know a catalogue grades food from A to E.
 */

/**
 * One token on purpose: two neutral greys a step apart measure 1.3:1, so the
 * axis label and the badge glyph carry the difference.
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
 * A copy of the tokens, unavoidably: this runs where no stylesheet has been
 * applied. nutri-score-palette.spec.ts parses the real file and compares.
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
