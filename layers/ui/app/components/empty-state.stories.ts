import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import UiEmptyState from './empty-state.vue'

/** A search that found nothing: it says so, and offers the way back. */
const meta = {
  title: 'Design system/Empty state',
  component: UiEmptyState,
  args: {
    title: 'No products match these filters',
    description: 'Try removing a filter or searching for a broader term.',
  },
  render: (args) => ({
    components: { UiEmptyState },
    setup: () => ({ args }),
    template: `
      <UiEmptyState v-bind="args">
        <button
          type="button"
          class="inline-flex h-9 items-center justify-center rounded-control bg-accent px-4 text-label text-ink-on-accent transition-colors hover:bg-accent-hover"
        >
          Clear all filters
        </button>
      </UiEmptyState>
    `,
  }),
} satisfies Meta<typeof UiEmptyState>

export default meta
type Story = StoryObj<typeof meta>

/** The directory with filters that leave nothing, and the button that clears them. */
export const NoResults: Story = {}

/** A page's own heading, for a product the catalogue does not hold. */
export const AsThePageHeading: Story = {
  args: {
    headingLevel: 1,
    title: 'No product under that barcode',
    description:
      'Nothing in the catalogue is registered as 0000000000000. It may not have been contributed yet.',
  },
  render: (args) => ({
    components: { UiEmptyState },
    setup: () => ({ args }),
    template: '<UiEmptyState v-bind="args" />',
  }),
}
