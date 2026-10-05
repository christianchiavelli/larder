import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import UiBreadcrumbs from './breadcrumbs.vue'
import UiPageHeader from './page-header.vue'

/** A page's title and what it is about, with room above for where it sits and beside for what it offers. */
const meta = {
  title: 'Design system/Page header',
  component: UiPageHeader,
  args: {
    title: 'Products',
    description: 'Filter the catalogue by category, brand, nutrition grade and processing level.',
  },
} satisfies Meta<typeof UiPageHeader>

export default meta
type Story = StoryObj<typeof meta>

/** The title and its line. */
export const Default: Story = {}

/** With the trail above it and an action beside it, as on the directory. */
export const WithEyebrowAndActions: Story = {
  render: (args) => ({
    components: { UiPageHeader, UiBreadcrumbs },
    setup: () => ({ args, trail: [{ text: 'Home', to: '/' }, { text: 'Products' }] }),
    template: `
      <UiPageHeader v-bind="args">
        <template #eyebrow><UiBreadcrumbs :items="trail" /></template>
        <template #actions>
          <button
            type="button"
            class="inline-flex h-9 items-center justify-center rounded-control bg-accent px-4 text-label text-ink-on-accent"
          >
            Export CSV
          </button>
        </template>
      </UiPageHeader>
    `,
  }),
}
