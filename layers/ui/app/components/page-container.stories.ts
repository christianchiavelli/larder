import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import UiPageContainer from './page-container.vue'

/** The page's column: one width and one gutter for every page, so their edges line up. */
const meta = {
  title: 'Design system/Page container',
  component: UiPageContainer,
  parameters: { layout: 'fullscreen' },
  render: () => ({
    components: { UiPageContainer },
    template: `
      <UiPageContainer>
        <div class="rounded-card border border-dashed border-edge p-6 text-body text-ink-muted">
          The page's content, 86rem at most, with a gutter that widens with the screen.
        </div>
      </UiPageContainer>
    `,
  }),
} satisfies Meta<typeof UiPageContainer>

export default meta

export const Default: StoryObj<typeof meta> = {}
