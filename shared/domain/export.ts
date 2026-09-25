import { MAX_TRACKED_HITS, type ProductCount } from './search'

export const FULL_DATASET_URL = 'https://world.openfoodfacts.org/data'

export type ExportVerdict = 'empty' | 'ready' | 'too-many'

export function exportVerdict({ totalCount, isTotalExact }: ProductCount): ExportVerdict {
  if (!isTotalExact || totalCount > MAX_TRACKED_HITS) return 'too-many'
  return totalCount === 0 ? 'empty' : 'ready'
}
