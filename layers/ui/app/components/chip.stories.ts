import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import UiChip from './chip.vue'

/** A short label: a category, a label a product carries, a filter in force. */
const meta = {
  title: 'Design system/Chip',
  component: UiChip,
  args: { tone: 'neutral' },
  argTypes: { tone: { control: 'inline-radio', options: ['neutral', 'accent', 'muted'] } },
  render: (args) => ({
    components: { UiChip },
    setup: () => ({ args }),
    template: '<UiChip v-bind="args">Breakfast cereals</UiChip>',
  }),
} satisfies Meta<typeof UiChip>

export default meta
type Story = StoryObj<typeof meta>

/** What a product is. */
export const Neutral: Story = {}

/** What the reader picked. */
export const Accent: Story = { args: { tone: 'accent' } }

/** What matters least on the page. */
export const Muted: Story = { args: { tone: 'muted' } }

/** With `to`, a chip is a link to the products it names. */
export const AsALink: Story = { args: { to: '/products?category=en:breakfast-cereals' } }
