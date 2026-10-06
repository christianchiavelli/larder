<script setup lang="ts">
import { FULL_DATASET_URL } from '#shared/domain/export'

const { siteName } = useRuntimeConfig().public
const { t, locale, defaultLocale } = useI18n()

const LINK_CLASSES =
  'text-ink-muted underline decoration-edge-strong underline-offset-2 hover:text-ink-accent hover:decoration-current'
</script>

<template>
  <footer class="border-t border-edge-subtle px-5 py-5 sm:px-8">
    <div
      class="mx-auto flex max-w-[86rem] flex-wrap items-baseline gap-x-2 gap-y-1 text-caption text-ink-subtle"
    >
      <span class="font-serif text-label font-semibold text-ink-muted">{{ siteName }}</span>
      <span aria-hidden="true">·</span>
      <i18n-t keypath="footer.attribution" tag="span" scope="global">
        <template #source>
          <a
            href="https://world.openfoodfacts.org"
            target="_blank"
            rel="noopener noreferrer"
            :class="LINK_CLASSES"
            >Open Food Facts</a
          >
        </template>
      </i18n-t>
      <a :href="FULL_DATASET_URL" target="_blank" rel="noopener noreferrer" :class="LINK_CLASSES">
        {{ t('footer.fullDataset') }}
      </a>
    </div>

    <!-- Only where the interface speaks another language than the catalogue's names. -->
    <p
      v-if="locale !== defaultLocale"
      class="mx-auto mt-2 max-w-[86rem] text-caption text-ink-muted"
      data-testid="language-note"
    >
      {{ t('footer.languageNote') }}
    </p>
  </footer>
</template>
