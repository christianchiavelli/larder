import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import UiErrorState from './error-state.vue'

/** The catalogue could not be reached: what happened, and a way to try again. */
const meta = {
  title: 'Design system/Error state',
  component: UiErrorState,
  args: {
    title: "We couldn't load the products",
    description: "Open Food Facts didn't answer this time. Give it a moment and try again.",
    retrying: false,
  },
} satisfies Meta<typeof UiErrorState>

export default meta
type Story = StoryObj<typeof meta>

/** Waiting for the reader to try again. */
export const Unreachable: Story = {}

/** Trying again: the button waits, and says so. */
export const Retrying: Story = { args: { retrying: true } }
