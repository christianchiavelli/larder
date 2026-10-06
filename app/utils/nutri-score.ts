import type { NutriScore } from '#shared/domain/nutrition'

/** The key a Nutri-Score value goes by in the messages, where no key has a hyphen. */
export function nutriScoreKey(value: NutriScore) {
  return value === 'not-applicable' ? 'notApplicable' : value
}
