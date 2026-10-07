import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { expect } from 'storybook/test'
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

/** A long name is cut short on the last step, never on the links before it, and stays on one line. */
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
  play: async ({ canvas }) => {
    const trail = canvas.getByRole('list')
    const link = canvas.getByRole('link', { name: 'Products' })
    const current = canvas.getByText(/^Organic dark chocolate/)
    const lineHeight = Number.parseFloat(getComputedStyle(trail).lineHeight)

    await expect(trail.getBoundingClientRect().height).toBeLessThan(lineHeight * 1.5)
    await expect(current.scrollWidth).toBeGreaterThan(current.clientWidth)
    await expect(link.scrollWidth).toBeLessThanOrEqual(link.clientWidth)
  },
}
