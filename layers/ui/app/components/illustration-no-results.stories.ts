import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import UiIllustrationNoResults from './illustration-no-results.vue'

/** The empty state's drawing, in the theme's own colours. */
const meta = {
  title: 'Design system/Illustrations/No results',
  component: UiIllustrationNoResults,
  render: () => ({
    components: { UiIllustrationNoResults },
    template: '<UiIllustrationNoResults class="w-60" />',
  }),
} satisfies Meta<typeof UiIllustrationNoResults>

export default meta

export const Default: StoryObj<typeof meta> = {}
