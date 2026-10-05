import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { NOVA_GROUPS } from '#shared/domain/nutrition'
import ProductNovaBadge from './nova-badge.vue'

/**
 * How processed a product is, on NOVA's four groups: from unprocessed (1) to
 * ultra-processed (4). A product nobody has classified gets a question mark.
 */
const meta = {
  title: 'Product/NOVA badge',
  component: ProductNovaBadge,
  args: { group: 4, size: 'sm', withLabel: false },
  argTypes: {
    group: { control: 'inline-radio', options: NOVA_GROUPS },
    size: { control: 'inline-radio', options: ['sm', 'lg'] },
  },
} satisfies Meta<typeof ProductNovaBadge>

export default meta
type Story = StoryObj<typeof meta>

/** Nutella's, at the size its page shows it. */
export const OnAProductPage: Story = { args: { size: 'lg' } }

/** The four groups and the unclassified, each named, as the filters list them. */
export const TheGroups: Story = {
  args: { withLabel: true },
  render: (args) => ({
    components: { ProductNovaBadge },
    setup: () => ({ args, groups: [...NOVA_GROUPS, null] }),
    template: `
      <ul class="flex flex-col gap-2">
        <li v-for="group in groups" :key="String(group)">
          <ProductNovaBadge v-bind="args" :group="group" />
        </li>
      </ul>
    `,
  }),
}
