const COMPACT_THRESHOLD = 10_000

const numberFormats = new Map<string, Intl.NumberFormat>()

/**
 * One formatter per locale and set of options, built the first time it is
 * asked for: they cost something to build and nothing to reuse.
 */
function numberFormat(locale: string, options: Intl.NumberFormatOptions = {}): Intl.NumberFormat {
  const key = `${locale} ${JSON.stringify(options)}`
  let format = numberFormats.get(key)
  if (!format) {
    format = new Intl.NumberFormat(locale, options)
    numberFormats.set(key, format)
  }
  return format
}

export function formatCount(value: number, locale: string): string {
  return numberFormat(locale).format(value)
}

export function formatCompact(value: number, locale: string): string {
  return numberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

export function formatCountCompact(value: number, locale: string): string {
  return value >= COMPACT_THRESHOLD
    ? numberFormat(locale, { notation: 'compact', maximumFractionDigits: 0 }).format(value)
    : formatCount(value, locale)
}

export function formatMeasure(value: number, precision: number, locale: string): string {
  return numberFormat(locale, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(value)
}

export function formatShare(part: number, whole: number, locale: string, precision = 1): string {
  if (whole === 0) return numberFormat(locale, { style: 'percent' }).format(0)
  return numberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(part / whole)
}

/**
 * The day in UTC: a page rendered on the server and hydrated in the browser would
 * otherwise print two different days for a timestamp near midnight.
 */
export function formatDate(value: string | Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(value),
  )
}
