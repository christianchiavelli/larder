// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import prettier from 'eslint-config-prettier'

export default withNuxt(
  {
    name: 'larder/rules',
    rules: {
      // An unused import is usually a half-finished refactor. The underscore
      // prefix is the escape hatch for a genuinely unused positional argument.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],

      // `any` erases the guarantees the rest of this codebase is built on. The
      // boundary with upstream is handled by Zod, which produces real types, so
      // there is no place left that legitimately needs it.
      '@typescript-eslint/no-explicit-any': 'error',

      // Empty catch blocks swallow the failure that would have explained a bug.
      'no-empty': ['error', { allowEmptyCatch: false }],

      'vue/multi-word-component-names': 'error',
      // Props with no declared type are how a component contract rots.
      'vue/require-prop-types': 'error',
      'vue/require-default-prop': 'off',
      // Ordering that mirrors how the template is read rather than authored.
      'vue/attributes-order': 'warn',
    },
  },
  {
    name: 'larder/pages',
    files: ['app/pages/**/*.vue', 'app/layouts/**/*.vue', 'app/error.vue', 'app/app.vue'],
    rules: {
      // A page's filename is its route. `index.vue` and `[code].vue` are named
      // by the URL they serve, so the multi-word rule is asking them to be
      // something they are not. It stays on everywhere else.
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    name: 'larder/tests',
    files: ['test/**/*.ts', 'e2e/**/*.ts'],
    rules: {
      // Fixtures are deliberately shaped like malformed upstream payloads, and
      // asserting on them is the point.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  // Last, so it can switch off every stylistic rule the others enabled.
  // Formatting belongs to Prettier alone.
  prettier,
)
