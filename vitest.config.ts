import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.spec.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      // What is measured, and what is deliberately not: `server/api` and `server/plugins` are
      // left out. A route parses its query and calls a service, and the service is measured
      // here; measuring the route would mean fabricating an event to prove a line of wiring.
      // What the route itself does is checked where it can be seen — `e2e/health.spec.ts`
      // answers the health route, and the specs assert the status codes the others return.
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
      // One global average says nothing about where the risk is: a hundred untested branches in
      // a composable and a hundred in the domain average out to the same number. These floors
      // are set per area, so the code that decides what a figure means has to be tested, while
      // the wiring around it is allowed a covered fault-path or two.
      //
      // Each sits about two points under what the suite reaches today, which is the margin that
      // keeps the gate a floor rather than a ceiling: a new file with a couple of untested
      // branches should not fail a build that is otherwise in good shape.
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
