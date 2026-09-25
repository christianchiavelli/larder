import { describe, expect, it } from 'vitest'
import { parse } from 'csv-parse/sync'
import { CSV_BYTE_ORDER_MARK, csvRecord } from '~~/server/utils/csv'

const roundTrip = (values: string[]) => parse(csvRecord(values))[0]

describe('csvRecord', () => {
  it('ends every record with CRLF, as RFC 4180 asks', () => {
    expect(csvRecord(['a', 'b'])).toBe('"a","b"\r\n')
  })

  it('quotes every text field, so no locale separator can split one', () => {
    expect(csvRecord(['Salt; vinegar', 'plain'])).toBe('"Salt; vinegar","plain"\r\n')
  })

  it('doubles a quote inside a field', () => {
    expect(csvRecord(['The "original"'])).toBe('"The ""original"""\r\n')
  })

  it('keeps commas and line breaks inside the field they belong to', () => {
    const values = ['Ferrero, Nutella', 'two\r\nlines', 'one\nline', 'a "quoted" word']

    expect(roundTrip(values)).toEqual(values)
  })

  it('writes numbers bare, in full precision and with a dot whatever the locale', () => {
    expect(csvRecord([467, 0.196, 1e-7, 0])).toBe('467,0.196,1e-7,0\r\n')
  })

  it('writes absence as an empty field, never as a zero or a word', () => {
    expect(csvRecord(['a', null, 'b'])).toBe('"a",,"b"\r\n')
  })

  it('writes a number that is not finite as absent rather than as NaN', () => {
    expect(csvRecord([Number.NaN, Number.POSITIVE_INFINITY])).toBe(',\r\n')
  })

  it('tells an empty string from an absent value', () => {
    expect(csvRecord(['', null])).toBe('"",\r\n')
  })

  describe('a field a spreadsheet would run as a formula', () => {
    const triggers = ['=', '+', '-', '@', '\t', '\r', '\n', '\uFF1D', '\uFF0B', '\uFF0D', '\uFF20']

    for (const trigger of triggers) {
      it(`is led by a tab when it starts with ${JSON.stringify(trigger)}`, () => {
        const [field] = roundTrip([`${trigger}1+1`])!

        expect(field).toBe(`\t${trigger}1+1`)
      })
    }

    it('covers names the catalogue really has', () => {
      expect(roundTrip(['+Proteínas Chocolate', '=HYPERLINK("https://example.test")'])).toEqual([
        '\t+Proteínas Chocolate',
        '\t=HYPERLINK("https://example.test")',
      ])
    })

    it('leaves the same characters alone anywhere but the start', () => {
      expect(roundTrip(['Salt & vinegar = crisps', 'Ben & Jerry @ home'])).toEqual([
        'Salt & vinegar = crisps',
        'Ben & Jerry @ home',
      ])
    })

    it('never touches a number, negative or not', () => {
      expect(csvRecord([-1.5])).toBe('-1.5\r\n')
    })
  })
})

describe('CSV_BYTE_ORDER_MARK', () => {
  it('is the UTF-8 signature Excel needs to read accents correctly', () => {
    expect(new TextEncoder().encode(CSV_BYTE_ORDER_MARK)).toEqual(
      new Uint8Array([0xef, 0xbb, 0xbf]),
    )
  })
})
