import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import UiStatTile from './stat-tile.vue'
import UiSurfaceCard from './surface-card.vue'

/** One figure and what it measures. A figure the source did not give is a dash, never a zero. */
const meta = {
  title: 'Design system/Stat tile',
  component: UiStatTile,
  // The overview's first tile, with the catalogue as it stood when this was written.
  args: {
    label: 'Products in catalogue',
    value: 3_585_939,
    caption: 'Across the whole catalogue',
    size: 'lg',
  },
  argTypes: { size: { control: 'inline-radio', options: ['md', 'lg'] } },
  // On a card, as on the overview: its quieter text is set for the card's white.
  decorators: [
    () => ({
      components: { UiSurfaceCard },
      template: '<UiSurfaceCard class="max-w-xs"><story /></UiSurfaceCard>',
    }),
  ],
} satisfies Meta<typeof UiStatTile>

export default meta
type Story = StoryObj<typeof meta>

/** How many products the catalogue holds. */
export const CatalogueSize: Story = {}

/** A share of the catalogue, to one decimal place. */
export const AShare: Story = {
  args: {
    label: 'Carry a Nutri-Score',
    value: 33.2,
    unit: '%',
    precision: 1,
    caption: 'The rest have no grade on record',
  },
}

/** A figure the source did not give: a dash on screen, "Not reported" to a screen reader. */
export const NotReported: Story = {
  args: {
    label: 'Carry a NOVA group',
    value: null,
    unit: '%',
    precision: 1,
    caption: 'The rest are not classified for processing',
  },
}

/** While the figure is on its way. */
export const Loading: Story = { args: { loading: true } }
