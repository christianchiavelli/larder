import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import UiSurfaceCard from '~~/layers/ui/app/components/surface-card.vue'
import { EMPTY_NUTRIENT_PROFILE } from '#shared/domain/nutrition'
import ProductNutrientTable from './nutrient-table.vue'

/**
 * What 100 g or ml of a product holds, beside its share of an adult's daily
 * reference intake. A value the label does not give is a dash, never a zero.
 */
const meta = {
  title: 'Product/Nutrient table',
  component: ProductNutrientTable,
  // Nutella (3017620422003), as Open Food Facts records it.
  args: {
    nutrients: {
      energyKcal: 539,
      fat: 30.9,
      saturatedFat: 10.6,
      carbohydrates: 57.5,
      sugars: 56.3,
      fiber: 0,
      proteins: 6.3,
      salt: 0.107,
      sodium: 0.0428,
    },
  },
  argTypes: { nutrients: { control: 'object' } },
  // On a card, as on the product page: its quieter text is set for the card's white.
  decorators: [
    () => ({
      components: { UiSurfaceCard },
      template: '<UiSurfaceCard class="max-w-2xl"><story /></UiSurfaceCard>',
    }),
  ],
} satisfies Meta<typeof ProductNutrientTable>

export default meta
type Story = StoryObj<typeof meta>

/** Nutella's, every nutrient given. */
export const EveryNutrient: Story = {}

/** Coca-Cola Original's (5449000000996), which gives no fibre. */
export const OneMissing: Story = {
  args: {
    nutrients: {
      energyKcal: 42.4,
      fat: 0,
      saturatedFat: 0,
      carbohydrates: 10.6,
      sugars: 10.6,
      fiber: null,
      proteins: 0,
      salt: 0,
      sodium: 0,
    },
  },
}

/** A record with no nutrition at all, which the table says outright. */
export const NoneGiven: Story = { args: { nutrients: EMPTY_NUTRIENT_PROFILE } }
