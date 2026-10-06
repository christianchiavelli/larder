import {
  formatCompact,
  formatCount,
  formatCountCompact,
  formatDate,
  formatMeasure,
  formatShare,
} from '../utils/format'

/**
 * Numbers and dates in the page's language: 3,585,939 or 3.585.939. The
 * language is read each time a value is formatted, so whatever formats one in
 * a template or a computed follows a change of language.
 */
export function useFormat() {
  const { localeProperties } = useI18n()
  const locale = () => localeProperties.value.language ?? 'en'

  return {
    count: (value: number) => formatCount(value, locale()),
    compact: (value: number) => formatCompact(value, locale()),
    countCompact: (value: number) => formatCountCompact(value, locale()),
    measure: (value: number, precision: number) => formatMeasure(value, precision, locale()),
    share: (part: number, whole: number, precision?: number) =>
      formatShare(part, whole, locale(), precision),
    date: (value: string | Date) => formatDate(value, locale()),
  }
}

export type Format = ReturnType<typeof useFormat>
