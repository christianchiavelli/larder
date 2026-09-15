import { describe, expect, it } from 'vitest'
import {
  formatCompact,
  formatCount,
  formatCountCompact,
  formatMeasure,
  formatShare,
} from '~~/layers/ui/app/utils/format'

/**
 * Number formatting.
 *
 * These were five separate declarations across five files, two of them a
 * character-for-character copy of each other. Pulled into one module, they are
 * also the first formatting decisions in this codebase that anything asserts:
 * the threshold where a count switches to compact, and the fact that a measured
 * figure pads to a fixed width, are both choices a column of numbers depends on
 * and neither was written down anywhere a reader would find it.
 */

describe('formatCount', () => {
  it('groups thousands', () => {
    expect(formatCount(3_585_939)).toBe('3,585,939')
  })

  it('leaves a small number alone', () => {
    expect(formatCount(42)).toBe('42')
  })
})

describe('formatCompact', () => {
  it('keeps one decimal, which is what an axis tick has room for', () => {
    expect(formatCompact(484_736)).toBe('484.7K')
    expect(formatCompact(2_395_620)).toBe('2.4M')
  })
})

describe('formatCountCompact', () => {
  /**
   * The threshold is the whole point of this one. Below it the exact figure is
   * short enough to keep; above it the count and the label beside it fill the
   * filter sidebar to within a pixel.
   */
  it('stays exact below ten thousand', () => {
    expect(formatCountCompact(9_999)).toBe('9,999')
  })

  it('compacts from ten thousand up, without a decimal', () => {
    expect(formatCountCompact(10_000)).toBe('10K')
    expect(formatCountCompact(484_736)).toBe('485K')
  })
})

describe('formatMeasure', () => {
  it('pads to the requested precision', () => {
    // 33.2 and 33.0 have to be the same width or the column stops lining up.
    expect(formatMeasure(33, 1)).toBe('33.0')
    expect(formatMeasure(33.24, 1)).toBe('33.2')
  })

  it('rounds rather than truncates', () => {
    expect(formatMeasure(33.26, 1)).toBe('33.3')
  })

  it('drops the decimal point entirely at precision zero', () => {
    expect(formatMeasure(33.6, 0)).toBe('34')
  })
})

describe('formatShare', () => {
  it('expresses a part of a whole as a percentage', () => {
    expect(formatShare(1, 4)).toBe('25.0%')
  })

  /**
   * An empty catalogue is a real state here: every filter applied and nothing
   * matching. Dividing by it would put `NaN%` on the chart.
   */
  it('returns zero rather than NaN when the whole is empty', () => {
    expect(formatShare(0, 0)).toBe('0%')
  })

  it('takes a precision', () => {
    expect(formatShare(1, 3, 2)).toBe('33.33%')
  })
})
