import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const locale = ref('en')
vi.mock('vue-i18n', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-i18n')>()),
  useI18n: () => ({ locale }),
}))

const { useLanguage } = await import('~/composables/use-language')

describe('useLanguage', () => {
  it('follows the language of the page', () => {
    locale.value = 'en'
    const language = useLanguage()
    expect(language.value).toBe('en')

    locale.value = 'pt'

    expect(language.value).toBe('pt')
  })

  it('asks for the default when the page is in a language the data does not have', () => {
    locale.value = 'fr'

    expect(useLanguage().value).toBe('en')
  })
})
