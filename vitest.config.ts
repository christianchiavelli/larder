import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    // Node is the default because most of this codebase is mappers, schemas and
    // pure domain logic that never touches a DOM. Component specs opt in with a
    // `// @vitest-environment nuxt` pragma, which costs a real Nuxt runtime and
    // is worth paying only where rendering is the thing under test.
    environment: 'node',
    include: ['test/**/*.spec.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      /**
       * A module whose behaviour is only observable in a browser is verified by
       * Playwright, not here: every `.vue` file, the chart theme composable and the
       * route handlers. `server/api` is excluded in the other direction, as transport
       * over `server/services`, which is measured.
       */
      include: [
        'shared/**/*.ts',
        'server/services/**/*.ts',
        'server/upstream/**/*.ts',
        'server/utils/**/*.ts',
        'app/api/**/*.ts',
        'app/composables/**/*.ts',
        'layers/ui/app/utils/**/*.ts',
      ],
      exclude: [
        '**/*.d.ts',
        '**/types.ts',
        // A registry of icon definitions and one Font Awesome setting. Whether a
        // name resolves is a type error, and whether it draws is a browser
        // question, so a spec here could only restate the file.
        'layers/ui/app/utils/icons.ts',
      ],
      /**
       * The measured figures, floored. A threshold with slack in it permits a
       * regression silently.
       */
      thresholds: {
        statements: 94,
        branches: 93,
        functions: 95,
        lines: 94,
      },
    },
  },
})
