import { THEME_BOOTSTRAP_SCRIPT } from './use-theme'

/**
 * The head every page shares: the title pattern, the theme set before the first
 * paint, and the page's language with its address in the other one. app.vue and
 * error.vue are separate roots, and the error page needs all of it too.
 */
export function useAppHead() {
  const { siteName } = useRuntimeConfig().public
  const { t } = useI18n()
  const localeHead = useLocaleHead()

  useHead(() => ({
    titleTemplate: (title?: string) => (title ? `${title} | ${siteName}` : siteName),
    htmlAttrs: localeHead.value.htmlAttrs,
    link: localeHead.value.link,
    script: [{ innerHTML: THEME_BOOTSTRAP_SCRIPT, tagPriority: 'critical' }],
    meta: [
      { name: 'description', content: t('site.description') },
      ...(localeHead.value.meta ?? []),
    ],
  }))
}
