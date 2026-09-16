/**
 * The locale is fixed: these are European reference intakes on an English page,
 * and switching separators alone would leave it half localised.
 */
const LOCALE = 'en'

const exact = new Intl.NumberFormat(LOCALE)

const compact = new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 })

const compactWhole = new Intl.NumberFormat(LOCALE, {
  notation: 'compact',
  maximumFractionDigits: 0,
})

/** Below this, compacting only loses detail. */
const COMPACT_THRESHOLD = 10_000

export function formatCount(value: number): string {
  return exact.format(value)
}

/** For axis ticks, where full precision overlaps into a smear. */
export function formatCompact(value: number): string {
  return compact.format(value)
}

export function formatCountCompact(value: number): string {
  return value >= COMPACT_THRESHOLD ? compactWhole.format(value) : exact.format(value)
}

/** Fixed in both directions, so a column of figures lines up. */
export function formatMeasure(value: number, precision: number): string {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(value)
}

export function formatShare(part: number, whole: number, precision = 1): string {
  return whole === 0 ? '0%' : `${((part / whole) * 100).toFixed(precision)}%`
}
