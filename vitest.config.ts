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
      exclude: [
        '**/*.d.ts',
        '**/types.ts',
        'layers/ui/app/utils/icons.ts',
        'app/composables/use-error-status.ts',
      ],
      thresholds: {
        statements: 95,
        branches: 94,
        functions: 96,
        lines: 95,
      },
    },
  },
})
