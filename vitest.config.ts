import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.spec.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      // `server/api` and `server/plugins` are out on purpose: a route parses its query and
      // calls a service, and the service is measured here. The e2e specs check the routes.
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
        'layers/ui/app/utils/icons.ts',
        // Thin wrappers over Nuxt's request and head, which only a rendered page exercises:
        // the end-to-end tests check the status codes, languages and head they produce.
        'app/composables/use-error-status.ts',
        'app/composables/use-app-head.ts',
        'app/composables/use-photo-preconnect.ts',
        // A VueUse wrapper that reads and writes the document. What it decides — when the
        // theme is dark, and how a switch happens without a transition per colour — is checked
        // where it can be seen: theme-bootstrap.spec.ts for the script that runs before the
        // first paint, and the end-to-end scans of both themes.
        'app/composables/use-theme.ts',
      ],
      // Floors per area, each about two points under what it reaches. A global average hides
      // where the risk is; and set at the limit it becomes a ceiling instead of a floor.
      thresholds: {
        statements: 93,
        branches: 91,
        functions: 94,
        lines: 93,

        // Pure, no I/O, and the thing every other layer trusts: nothing here ships untested.
        'shared/domain/**': { statements: 99, branches: 96, functions: 100, lines: 100 },
        'server/services/**': { statements: 94, branches: 89, functions: 99, lines: 95 },
        'server/upstream/**': { statements: 96, branches: 95, functions: 95, lines: 96 },
        'server/utils/**': { statements: 90, branches: 91, functions: 92, lines: 90 },
        'app/api/**': { statements: 100, branches: 100, functions: 100, lines: 100 },
        'app/composables/**': { statements: 95, branches: 89, functions: 93, lines: 95 },
        'layers/ui/app/utils/**': { statements: 99, branches: 99, functions: 99, lines: 99 },
      },
    },
  },
})
