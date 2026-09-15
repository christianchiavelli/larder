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
       * Scoped to what a unit test is the right tool for.
       *
       * The rule is one line: a module whose behaviour is only observable in a
       * browser is verified by the Playwright suite, not by this one. That
       * covers every `.vue` file, the chart theme composable, and the route
       * handlers, and it is applied uniformly rather than per awkward file.
       *
       * The alternative was measuring them here, which means one of two things.
       * Either the number reads 43% while the behaviour is in fact covered by
       * 58 end-to-end assertions, which trains everyone to ignore it, or the
       * gap gets filled with jsdom renders written to move the number: a chart
       * whose hover state cannot be drawn, a hydration mismatch that cannot
       * occur because nothing was server-rendered, a Tailwind utility that
       * resolves to nothing because no stylesheet was built. Each of those is
       * a real bug this project has already shipped once, and not one of them
       * is visible outside a browser.
       *
       * `server/api` is excluded in the other direction: the handlers are
       * transport over `server/services`, which is measured here at 93%, and
       * covering them would mean booting Nitro to re-assert it.
       */
      include: [
        'shared/**/*.ts',
        'server/services/**/*.ts',
        'server/upstream/**/*.ts',
        'server/utils/**/*.ts',
        'app/api/**/*.ts',
        'app/composables/**/*.ts',
      ],
      exclude: ['**/*.d.ts', '**/types.ts'],
      /**
       * The measured figures, not a round number below them.
       *
       * A threshold set comfortably under actual coverage permits a regression
       * silently, which is the failure it exists to prevent. These are exact,
       * so removing a test fails the run, and raising them is a matter of
       * re-reading the report rather than guessing.
       */
      thresholds: {
        statements: 92,
        branches: 91,
        functions: 90,
        lines: 92,
      },
    },
  },
})
