import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { NUTRI_SCORE_VALUES } from '#shared/domain/nutrition'
import ProductNutriScoreBadge from './nutri-score-badge.vue'

/**
 * A product's Nutri-Score, in the scheme's own colours. Ungraded is a value of
 * its own, never a grade: unknown where nobody has computed it, not applicable
 * where the scheme does not cover the product.
 */
const meta = {
  title: 'Product/Nutri-Score badge',
  component: ProductNutriScoreBadge,
  args: { grade: 'e', size: 'md' },
  argTypes: {
    grade: { control: 'select', options: NUTRI_SCORE_VALUES },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof ProductNutriScoreBadge>

export default meta
type Story = StoryObj<typeof meta>

/** Nutella's, at the size its page shows it. */
export const OnAProductPage: Story = { args: { size: 'lg' } }

/** Every value it takes: A to E, then the two ungraded ones. */
export const TheScale: Story = {
  render: (args) => ({
    components: { ProductNutriScoreBadge },
    setup: () => ({ args, grades: NUTRI_SCORE_VALUES }),
    template: `
      <ul class="flex flex-wrap items-center gap-3">
        <li v-for="grade in grades" :key="grade">
          <ProductNutriScoreBadge v-bind="args" :grade="grade" />
        </li>
      </ul>
    `,
  }),
}
