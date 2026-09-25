type FieldState = 'start' | 'unquoted' | 'quoted' | 'closed'

export function parseCsv(text: string): string[][] {
  const records: string[][] = []
  let record: string[] = []
  let field = ''
  let state: FieldState = 'start'

  const endField = () => {
    record.push(field)
    field = ''
    state = 'start'
  }

  const endRecord = () => {
    endField()
    records.push(record)
    record = []
  }

  for (let index = 0; index < text.length; index++) {
    const char = text[index]!

    if (state === 'quoted') {
      if (char !== '"') field += char
      else if (text[index + 1] === '"') {
        field += '"'
        index++
      } else state = 'closed'
      continue
    }

    if (char === ',') endField()
    else if (char === '\r' && text[index + 1] === '\n') {
      endRecord()
      index++
    } else if (char === '"' && state === 'start') state = 'quoted'
    else if (state === 'closed' || char === '"' || char === '\r' || char === '\n') {
      throw new SyntaxError(`Not RFC 4180 at offset ${index}: ${JSON.stringify(char)}`)
    } else {
      field += char
      state = 'unquoted'
    }
  }

  if (state === 'quoted') throw new SyntaxError('A quoted field is never closed')
  if (state !== 'start' || record.length > 0) endRecord()

  return records
}
