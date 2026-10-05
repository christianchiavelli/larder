import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import UiSurfaceCard from '~~/layers/ui/app/components/surface-card.vue'
import ProductNutriScoreChart from './nutri-score-chart.vue'

/**
 * How the catalogue spreads over the Nutri-Score grades, ungraded included:
 * most of it has no grade, and the chart does not hide that.
 */
const meta = {
  title: 'Product/Nutri-Score chart',
  component: ProductNutriScoreChart,
  // The whole catalogue on 5 October 2026, as Open Food Facts' search counted it.
  args: {
    distribution: {
      a: 189_530,
      b: 161_791,
      c: 255_112,
      d: 353_658,
      e: 230_228,
      unknown: 2_324_595,
      'not-applicable': 71_025,
    },
    loading: false,
  },
  argTypes: { distribution: { control: false } },
  // On a card, as on the overview.
  decorators: [
    () => ({
      components: { UiSurfaceCard },
      template: '<UiSurfaceCard class="max-w-2xl"><story /></UiSurfaceCard>',
    }),
  ],
} satisfies Meta<typeof ProductNutriScoreChart>

export default meta
type Story = StoryObj<typeof meta>

/** The catalogue, grade by grade. */
export const TheCatalogue: Story = {}

/** While the counts are on their way. */
export const Loading: Story = { args: { loading: true } }
