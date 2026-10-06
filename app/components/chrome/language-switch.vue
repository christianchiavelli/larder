<script setup lang="ts">
/**
 * The languages, stacked to the rail's own direction: the current one raised
 * like the page you are on, the other a link to this same page in it, filters
 * and all. Each names itself in its own language, on hover and to a screen
 * reader, after the code it shows, so someone who speaks to the page can say
 * "PT" and be understood.
 */
const { locale, locales, t } = useI18n()
const switchLocalePath = useSwitchLocalePath()
const localePath = useLocalePath()

const languages = computed(() =>
  locales.value.map((entry) => ({
    code: entry.code,
    short: entry.code.toUpperCase(),
    name: entry.name ?? entry.code,
    language: entry.language,
    current: entry.code === locale.value,
    // An address no route answers has no twin in the other language, so its front page stands in.
    to: switchLocalePath(entry.code) || localePath('/', entry.code),
  })),
)

const SEGMENT =
  'group relative flex h-[1.625rem] w-[2.125rem] items-center justify-center rounded-control text-[0.6875rem] leading-none tracking-[0.03em]'

const TOOLTIP =
  'pointer-events-none absolute left-full z-50 ml-3 origin-left scale-95 rounded-control bg-chrome-raised px-2 py-1 text-caption font-normal tracking-normal whitespace-nowrap text-chrome-ink-strong opacity-0 shadow-overlay transition group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100'
</script>

<template>
  <nav
    :aria-label="t('chrome.language')"
    class="flex flex-col gap-0.5 rounded-control-frame p-[0.1875rem] ring-1 ring-chrome-ink/20 ring-inset"
  >
    <template v-for="entry in languages" :key="entry.code">
      <span
        v-if="entry.current"
        :class="[SEGMENT, 'bg-chrome-raised font-bold text-chrome-ink-strong']"
        aria-current="true"
        :lang="entry.language"
      >
        {{ entry.short }}
        <span aria-hidden="true" :class="TOOLTIP">{{ entry.name }}</span>
      </span>

      <NuxtLink
        v-else
        :to="entry.to"
        :hreflang="entry.language"
        :lang="entry.language"
        :class="[
          SEGMENT,
          'font-medium text-chrome-ink transition-colors hover:bg-chrome-raised/55 hover:text-chrome-ink-strong',
        ]"
      >
        {{ entry.short }}<span class="sr-only">, {{ entry.name }}</span>
        <span aria-hidden="true" :class="TOOLTIP">{{ entry.name }}</span>
      </NuxtLink>
    </template>
  </nav>
</template>
