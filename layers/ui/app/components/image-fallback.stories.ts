import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import UiImageFallback from './image-fallback.vue'

/** Where a product has no photograph: a quiet glyph that says so, never a broken image. */
const meta = {
  title: 'Design system/Image fallback',
  component: UiImageFallback,
  args: { size: 'sm' },
  argTypes: { size: { control: 'inline-radio', options: ['sm', 'lg'] } },
  render: (args) => ({
    components: { UiImageFallback },
    setup: () => ({ args }),
    template:
      '<div class="overflow-hidden rounded-card" :class="args.size === \'lg\' ? \'size-64\' : \'size-20\'"><UiImageFallback v-bind="args" /></div>',
  }),
} satisfies Meta<typeof UiImageFallback>

export default meta
type Story = StoryObj<typeof meta>

/** In a product's row of the directory, beside its name, where it only fills the space. */
export const InARow: Story = {}

/** On a product's page, where it stands for the photograph and says so. */
export const OnTheProductPage: Story = {
  args: { size: 'lg', label: 'No photograph of this product' },
}
