import { describe, expect, it } from 'vitest'
import { DEFAULT_LANGUAGE, LANGUAGES, languageSchema } from '#shared/domain/language'

describe('languageSchema', () => {
  it.each(LANGUAGES)('reads %s', (language) => {
    expect(languageSchema.parse(language)).toBe(language)
  })

  it.each([undefined, '', 'fr', 'pt-BR', ['pt'], 42])(
    'reads %o as the default rather than failing the request',
    (value) => {
      expect(languageSchema.parse(value)).toBe(DEFAULT_LANGUAGE)
    },
  )

  it('defaults to English', () => {
    expect(DEFAULT_LANGUAGE).toBe('en')
  })
})
