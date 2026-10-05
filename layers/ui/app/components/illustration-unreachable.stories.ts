import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import UiIllustrationUnreachable from './illustration-unreachable.vue'

/** The error state's drawing, in the theme's own colours. */
const meta = {
  title: 'Design system/Illustrations/Unreachable',
  component: UiIllustrationUnreachable,
  render: () => ({
    components: { UiIllustrationUnreachable },
    template: '<UiIllustrationUnreachable class="w-60" />',
  }),
} satisfies Meta<typeof UiIllustrationUnreachable>

export default meta

export const Default: StoryObj<typeof meta> = {}
