import type { StorybookConfig } from '@storybook-vue/nuxt'

/**
 * Storybook boots the Nuxt app itself, so stories get what the pages get:
 * the layer's auto-imported components and composables, Tailwind through the
 * Vite plugin, the fonts module and the global stylesheet.
 */
const config: StorybookConfig = {
  stories: ['../layers/ui/app/**/*.stories.ts', '../app/**/*.stories.ts'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-themes'],
  framework: {
    name: '@storybook-vue/nuxt',
    // Props read off their TypeScript types, through the app's own tsconfig,
    // rather than vue-docgen-api, which Storybook is retiring.
    options: { docgen: { plugin: 'vue-component-meta', tsconfig: '.nuxt/tsconfig.app.json' } },
  },
  core: { disableTelemetry: true },
  // The app's own public folder, so the tab shows its favicon rather than Storybook's.
  staticDirs: ['../public'],
}

export default config
