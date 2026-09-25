export type CsvValue = string | number | null

export const CSV_BYTE_ORDER_MARK = '\uFEFF'

const FORMULA_TRIGGER = /^[=+\-@\t\r\n\uFF1D\uFF0B\uFF0D\uFF20]/

function csvField(value: CsvValue): string {
  if (value === null) return ''
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''

  const inert = FORMULA_TRIGGER.test(value) ? `\t${value}` : value
  return `"${inert.replaceAll('"', '""')}"`
}

export function csvRecord(values: readonly CsvValue[]): string {
  return `${values.map(csvField).join(',')}\r\n`
}
