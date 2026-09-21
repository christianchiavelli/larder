// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import prettier from 'eslint-config-prettier'

export default withNuxt(
  {
    name: 'larder/rules',
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],

      '@typescript-eslint/no-explicit-any': 'error',

      'no-empty': ['error', { allowEmptyCatch: false }],

      'vue/multi-word-component-names': 'error',
      'vue/require-prop-types': 'error',
      'vue/require-default-prop': 'off',
      'vue/attributes-order': 'warn',
    },
  },
  {
    name: 'larder/ui-layer',
    files: ['layers/ui/app/components/**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    name: 'larder/prefixed-components',
    files: ['app/components/*/**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    name: 'larder/pages',
    files: ['app/pages/**/*.vue', 'app/layouts/**/*.vue', 'app/error.vue', 'app/app.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    name: 'larder/tests',
    files: ['test/**/*.ts', 'e2e/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  prettier,
)
