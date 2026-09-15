/**
 * Number formatting.
 *
 * One module because these are decisions, not conveniences, and a decision made
 * in five files is five decisions waiting to disagree. Two of those five held a
 * character-for-character copy of the same formatter and the same five-line
 * comment explaining it.
 *
 * The locale is fixed rather than taken from the visitor. Every figure in this
 * product is a count or a nutrient measured against a European reference
 * intake, and the page around them is written in English; switching the
 * separators alone would produce a page that is half localised, which is worse
 * than one that is not. It lives here so that changing that is one edit.
 */
const LOCALE = 'en'

/** Every digit. For figures a reader compares, and for any accessible name. */
const exact = new Intl.NumberFormat(LOCALE)

/**
 * Compact, one decimal. For chart axis ticks.
 *
 * These counts run into the millions, and "2,395,620" repeated down an axis
 * overlaps into an unreadable smear at any width a chart in this layout gets.
 * Full precision stays in the tooltip, the bar labels and the data table.
 */
const compact = new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 })

/**
 * Compact, no decimal. For counts sitting beside a label in a narrow column.
 *
 * "484.7K" and "485K" carry the same decision, and the shorter one leaves the
 * label beside it room to breathe: at full precision the two together fill the
 * filter sidebar to within a pixel and the list reads as cramped.
 */
const compactWhole = new Intl.NumberFormat(LOCALE, {
  notation: 'compact',
  maximumFractionDigits: 0,
})

/** Below this a number is short enough that compacting it only loses detail. */
const COMPACT_THRESHOLD = 10_000

export function formatCount(value: number): string {
  return exact.format(value)
}

export function formatCompact(value: number): string {
  return compact.format(value)
}

/** Exact while it stays short, compact once it would crowd its neighbour. */
export function formatCountCompact(value: number): string {
  return value >= COMPACT_THRESHOLD ? compactWhole.format(value) : exact.format(value)
}

/**
 * A measured figure, at a fixed number of decimals.
 *
 * Fixed in both directions: 33.2 and 33.0 have to occupy the same width, or a
 * column of them stops lining up and the reader loses the comparison the column
 * exists for.
 */
export function formatMeasure(value: number, precision: number): string {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(value)
}

/** A share of a whole, as a percentage. Returns `0%` rather than `NaN%`. */
export function formatShare(part: number, whole: number, precision = 1): string {
  return whole === 0 ? '0%' : `${((part / whole) * 100).toFixed(precision)}%`
}
