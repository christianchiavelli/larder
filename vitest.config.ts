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
      include: ['app/**/*.{ts,vue}', 'server/**/*.ts', 'shared/**/*.ts', 'layers/**/*.{ts,vue}'],
      exclude: ['**/*.d.ts', '**/types.ts'],
      thresholds: {
        // Set at what the suite currently holds, to be raised deliberately.
        // A threshold below actual coverage silently permits regressions.
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
})
