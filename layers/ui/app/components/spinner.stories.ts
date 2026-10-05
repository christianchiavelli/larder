import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import UiSpinner from './spinner.vue'

/** Work under way, for the few waits that have no shape to show: a button retrying, a file being written. */
const meta = {
  title: 'Design system/Spinner',
  component: UiSpinner,
  render: (args) => ({
    components: { UiSpinner },
    setup: () => ({ args }),
    template: '<UiSpinner v-bind="args" class="size-6 text-ink-accent" />',
  }),
} satisfies Meta<typeof UiSpinner>

export default meta
type Story = StoryObj<typeof meta>

/** On its own, it says what it waits for. */
export const Labelled: Story = { args: { label: 'Loading the products' } }

/** Beside words that already say it, it is hidden from screen readers. */
export const BesideWords: Story = {
  render: () => ({
    components: { UiSpinner },
    template:
      '<span class="inline-flex items-center gap-2 text-label text-ink"><UiSpinner class="size-3.5" /> Trying again</span>',
  }),
}
