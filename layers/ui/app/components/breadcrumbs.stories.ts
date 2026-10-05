import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import UiBreadcrumbs from './breadcrumbs.vue'

/** Where the page sits: each step a link back up, the last one the page itself. */
const meta = {
  title: 'Design system/Breadcrumbs',
  component: UiBreadcrumbs,
  args: {
    items: [
      { text: 'Products', to: '/products' },
      { text: 'Breakfast cereals', to: '/products?category=en:breakfast-cereals' },
      { text: 'Chocapic' },
    ],
  },
} satisfies Meta<typeof UiBreadcrumbs>

export default meta
type Story = StoryObj<typeof meta>

/** Three steps deep, as on a product's page. */
export const ProductPage: Story = {}

/** A long name is cut short on the last step, never on the links before it. */
export const ALongName: Story = {
  args: {
    items: [
      { text: 'Products', to: '/products' },
      { text: 'Organic dark chocolate with sea salt and caramelised almonds, 85% cocoa' },
    ],
  },
  render: (args) => ({
    components: { UiBreadcrumbs },
    setup: () => ({ args }),
    template: '<div class="max-w-xs"><UiBreadcrumbs v-bind="args" /></div>',
  }),
}
