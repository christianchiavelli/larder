import { readFileSync } from 'node:fs'
import { baseCompile } from '@intlify/message-compiler'
import { describe, expect, it } from 'vitest'
import { nutriScoreKey } from '~/utils/nutri-score'
import { NOVA_GROUPS, NUTRIENT_KEYS, NUTRI_SCORE_VALUES } from '#shared/domain/nutrition'
import { SORT_OPTIONS, TAG_DIMENSIONS } from '#shared/domain/search'

interface Messages {
  [key: string]: string | Messages
}

// Read as text: an import would hand over what the i18n plugin compiled the file into.
function read(path: string): Messages {
  return JSON.parse(readFileSync(path, 'utf8')) as Messages
}

function flatten(messages: Messages, prefix = ''): Record<string, string> {
  return Object.fromEntries(
    Object.entries(messages).flatMap(([key, value]) =>
      typeof value === 'string'
        ? [[`${prefix}${key}`, value]]
        : Object.entries(flatten(value, `${prefix}${key}.`)),
    ),
  )
}

const placeholders = (message: string) =>
  [...new Set([...message.matchAll(/\{(\w+)\}/g)].map((match) => match[1]))].sort()

const pluralForms = (message: string) => message.split('|').length

const appEnglish = read('i18n/locales/en.json')
const appPortuguese = read('i18n/locales/pt-BR.json')
const uiEnglish = read('layers/ui/i18n/locales/en.json')
const uiPortuguese = read('layers/ui/i18n/locales/pt-BR.json')

describe.each([
  { owner: 'the app', en: flatten(appEnglish), pt: flatten(appPortuguese) },
  { owner: 'the ui layer', en: flatten(uiEnglish), pt: flatten(uiPortuguese) },
])('the messages of $owner', ({ en, pt }) => {
  it('say the same things in both languages', () => {
    expect(Object.keys(pt).sort()).toEqual(Object.keys(en).sort())
  })

  it('fill in the same values in both languages', () => {
    for (const [key, message] of Object.entries(en)) {
      expect(placeholders(pt[key] ?? ''), key).toEqual(placeholders(message))
    }
  })

  it('agree on the plural forms, where a language may need none', () => {
    for (const [key, message] of Object.entries(en)) {
      const forms = new Set([pluralForms(message), pluralForms(pt[key] ?? '')])
      forms.delete(1)
      expect(forms.size, key).toBeLessThanOrEqual(1)
    }
  })

  it('all compile, since a stray brace or @ would print the key instead', () => {
    const errors: string[] = []
    for (const [language, messages] of Object.entries({ en, pt })) {
      for (const [key, message] of Object.entries(messages)) {
        baseCompile(message, {
          onError: (error) => errors.push(`${language} ${key}: ${error.message}`),
        })
      }
    }

    expect(errors).toEqual([])
  })
})

describe.each([
  ['English', flatten(appEnglish)],
  ['Portuguese', flatten(appPortuguese)],
])('the %s messages', (_, messages) => {
  it('name every Nutri-Score value, long and short', () => {
    for (const value of NUTRI_SCORE_VALUES) {
      expect(messages[`nutriScore.grade.${nutriScoreKey(value)}`], value).toBeTruthy()
      expect(messages[`nutriScore.short.${nutriScoreKey(value)}`], value).toBeTruthy()
    }
  })

  it('keep the short Nutri-Score labels distinct, since they are what the reader sees', () => {
    const short = NUTRI_SCORE_VALUES.map(
      (value) => messages[`nutriScore.short.${nutriScoreKey(value)}`],
    )
    expect(new Set(short).size).toBe(short.length)
  })

  it('name every NOVA group, long and short', () => {
    for (const group of NOVA_GROUPS) {
      expect(messages[`nova.group.${group}`], String(group)).toBeTruthy()
      expect(messages[`nova.short.${group}`], String(group)).toBeTruthy()
    }
  })

  it('name every nutrient, sort and filter dimension', () => {
    const keys = [
      ...NUTRIENT_KEYS.map((key) => `nutrients.${key}`),
      ...SORT_OPTIONS.map((option) => `sort.${option}`),
      ...TAG_DIMENSIONS.map((dimension) => `dimensions.${dimension}.name`),
    ]

    expect(keys.filter((key) => !messages[key])).toEqual([])
  })
})
