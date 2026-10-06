import { describe, expect, it } from 'vitest'
import {
  formatCompact,
  formatCount,
  formatCountCompact,
  formatDate,
  formatMeasure,
  formatShare,
} from '~~/layers/ui/app/utils/format'

// ICU separates a number from its compact unit with a no-break space in Portuguese.
const NBSP = '\u00a0'

describe('formatCount', () => {
  it('groups thousands the way each language does', () => {
    expect(formatCount(3_585_939, 'en')).toBe('3,585,939')
    expect(formatCount(3_585_939, 'pt-BR')).toBe('3.585.939')
  })

  it('leaves a small number alone', () => {
    expect(formatCount(42, 'pt-BR')).toBe('42')
  })
})

describe('formatCompact', () => {
  it('keeps one decimal, which is what an axis tick has room for', () => {
    expect(formatCompact(484_736, 'en')).toBe('484.7K')
    expect(formatCompact(2_395_620, 'en')).toBe('2.4M')
  })

  it('writes the unit as Portuguese does, with a decimal comma', () => {
    expect(formatCompact(484_736, 'pt-BR')).toBe(`484,7${NBSP}mil`)
    expect(formatCompact(2_395_620, 'pt-BR')).toBe(`2,4${NBSP}mi`)
  })
})

describe('formatCountCompact', () => {
  it('stays exact below ten thousand', () => {
    expect(formatCountCompact(9_999, 'en')).toBe('9,999')
    expect(formatCountCompact(9_999, 'pt-BR')).toBe('9.999')
  })

  it('compacts from ten thousand up, without a decimal', () => {
    expect(formatCountCompact(10_000, 'en')).toBe('10K')
    expect(formatCountCompact(484_736, 'en')).toBe('485K')
    expect(formatCountCompact(484_736, 'pt-BR')).toBe(`485${NBSP}mil`)
  })
})

describe('formatMeasure', () => {
  it('pads to the requested precision', () => {
    expect(formatMeasure(33, 1, 'en')).toBe('33.0')
    expect(formatMeasure(33.24, 1, 'en')).toBe('33.2')
  })

  it('writes the decimal the way the language does', () => {
    expect(formatMeasure(33, 1, 'pt-BR')).toBe('33,0')
  })

  it('rounds rather than truncates', () => {
    expect(formatMeasure(33.26, 1, 'en')).toBe('33.3')
  })

  it('drops the decimal point entirely at precision zero', () => {
    expect(formatMeasure(33.6, 0, 'pt-BR')).toBe('34')
  })
})

describe('formatShare', () => {
  it('expresses a part of a whole as a percentage', () => {
    expect(formatShare(1, 4, 'en')).toBe('25.0%')
    expect(formatShare(1, 4, 'pt-BR')).toBe('25,0%')
  })

  it('returns zero rather than NaN when the whole is empty', () => {
    expect(formatShare(0, 0, 'en')).toBe('0%')
    expect(formatShare(0, 0, 'pt-BR')).toBe('0%')
  })

  it('takes a precision', () => {
    expect(formatShare(1, 3, 'en', 2)).toBe('33.33%')
  })
})

describe('formatDate', () => {
  it('writes the date the way each language does', () => {
    expect(formatDate('2026-10-06T12:00:00Z', 'en')).toBe('Oct 6, 2026')
    expect(formatDate('2026-10-06T12:00:00Z', 'pt-BR')).toBe('6 de out. de 2026')
  })

  it('reads the day in UTC, so the server and the browser print the same one', () => {
    expect(formatDate('2026-10-06T00:30:00Z', 'en')).toBe('Oct 6, 2026')
    expect(formatDate('2026-10-05T23:30:00Z', 'en')).toBe('Oct 5, 2026')
  })
})
