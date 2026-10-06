/**
 * Text the way a search compares it: lower case and without accents, so "franca"
 * finds "França" and "cote" finds "Côte d'Ivoire", the way most people type.
 */
export function foldForSearch(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}
