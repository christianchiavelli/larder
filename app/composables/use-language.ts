import { computed } from 'vue'
import { languageSchema } from '#shared/domain/language'

/** The page's language as the data asks for it, so queries cache each language apart. */
export function useLanguage() {
  const { locale } = useI18n()
  return computed(() => languageSchema.parse(locale.value))
}
