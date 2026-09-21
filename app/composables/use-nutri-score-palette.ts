import type { NutriScore } from '#shared/domain/nutrition'

const TOKENS: Record<NutriScore, string> = {
  a: '--nutriscore-a',
  b: '--nutriscore-b',
  c: '--nutriscore-c',
  d: '--nutriscore-d',
  e: '--nutriscore-e',
  unknown: '--nutriscore-ungraded',
  'not-applicable': '--nutriscore-ungraded',
}

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
