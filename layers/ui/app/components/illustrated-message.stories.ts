import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import UiIllustratedMessage from './illustrated-message.vue'
import UiIllustrationNoResults from './illustration-no-results.vue'

/** A drawing, a heading and a line under it: what the empty and error states are made of. */
const meta = {
  title: 'Design system/Illustrated message',
  component: UiIllustratedMessage,
  args: {
    title: 'Nothing here yet',
    description: 'Pick a category or a brand to start.',
  },
  render: (args) => ({
    components: { UiIllustratedMessage, UiIllustrationNoResults },
    setup: () => ({ args }),
    template: `
      <UiIllustratedMessage v-bind="args">
        <template #illustration>
          <UiIllustrationNoResults class="w-44 sm:w-60" />
        </template>
      </UiIllustratedMessage>
    `,
  }),
} satisfies Meta<typeof UiIllustratedMessage>

export default meta

export const Default: StoryObj<typeof meta> = {}
