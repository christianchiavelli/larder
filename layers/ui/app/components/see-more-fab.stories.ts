import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { SCROLL_SECTION_ATTRIBUTE } from '../composables/use-scroll-sections'
import UiSeeMoreFab from './see-more-fab.vue'

/** On a long page of sections, a button that skips to the next one, and leaves once there is none. */
const meta = {
  title: 'Design system/See more button',
  component: UiSeeMoreFab,
  parameters: { layout: 'fullscreen' },
  render: () => ({
    components: { UiSeeMoreFab },
    setup: () => ({
      attribute: SCROLL_SECTION_ATTRIBUTE,
      sections: ['Nutrition grades', 'Processing levels', 'Largest categories', 'Top brands'],
    }),
    template: `
      <div>
        <section
          v-for="section in sections"
          :key="section"
          v-bind="{ [attribute]: '' }"
          class="flex min-h-[80vh] items-start border-b border-edge-subtle p-8"
        >
          <h2 class="text-heading text-ink">{{ section }}</h2>
        </section>
        <UiSeeMoreFab />
      </div>
    `,
  }),
} satisfies Meta<typeof UiSeeMoreFab>

export default meta

export const OnALongPage: StoryObj<typeof meta> = {}
