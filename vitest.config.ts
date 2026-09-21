import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.spec.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: [
        'shared/**/*.ts',
        'server/services/**/*.ts',
        'server/upstream/**/*.ts',
        'server/utils/**/*.ts',
        'app/api/**/*.ts',
        'app/composables/**/*.ts',
        'layers/ui/app/utils/**/*.ts',
      ],
      exclude: ['**/*.d.ts', '**/types.ts', 'layers/ui/app/utils/icons.ts'],
      thresholds: {
        statements: 94,
        branches: 93,
        functions: 95,
        lines: 94,
      },
    },
  },
})
