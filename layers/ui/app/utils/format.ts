const LOCALE = 'en'

const exact = new Intl.NumberFormat(LOCALE)

const compact = new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 })

const compactWhole = new Intl.NumberFormat(LOCALE, {
  notation: 'compact',
  maximumFractionDigits: 0,
})

const COMPACT_THRESHOLD = 10_000

export function formatCount(value: number): string {
  return exact.format(value)
}

export function formatCompact(value: number): string {
  return compact.format(value)
}

export function formatCountCompact(value: number): string {
  return value >= COMPACT_THRESHOLD ? compactWhole.format(value) : exact.format(value)
}

export function formatMeasure(value: number, precision: number): string {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(value)
}

export function formatShare(part: number, whole: number, precision = 1): string {
  return whole === 0 ? '0%' : `${((part / whole) * 100).toFixed(precision)}%`
}
