import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import UiSurfaceCard from './surface-card.vue'

/** A raised surface for one thing: a product, a chart, a group of filters. */
const meta = {
  title: 'Design system/Surface card',
  component: UiSurfaceCard,
  args: { padding: 'md', interactive: false },
  argTypes: { padding: { control: 'inline-radio', options: ['none', 'sm', 'md', 'lg'] } },
  render: (args) => ({
    components: { UiSurfaceCard },
    setup: () => ({ args }),
    template: `
      <UiSurfaceCard v-bind="args" class="max-w-sm">
        <h3 class="text-subheading text-ink">Chocapic</h3>
        <p class="text-label text-ink-muted">Nestlé · 430 g</p>
      </UiSurfaceCard>
    `,
  }),
} satisfies Meta<typeof UiSurfaceCard>

export default meta
type Story = StoryObj<typeof meta>

/** At rest. */
export const Default: Story = {}

/** When the whole card leads somewhere, it answers the pointer. */
export const Interactive: Story = { args: { interactive: true } }
