import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import UiSkeleton from './skeleton.vue'

/** Something still on its way, in its own shape, so the page does not move when it comes. */
const meta = {
  title: 'Design system/Skeleton',
  component: UiSkeleton,
  args: { rounded: 'control' },
  argTypes: { rounded: { control: 'inline-radio', options: ['control', 'card', 'full'] } },
  render: (args) => ({
    components: { UiSkeleton },
    setup: () => ({ args }),
    template: '<UiSkeleton v-bind="args" class="h-8 w-48" />',
  }),
} satisfies Meta<typeof UiSkeleton>

export default meta
type Story = StoryObj<typeof meta>

/** A line of text or a value. */
export const Line: Story = {}

/** A card still loading. */
export const Card: Story = {
  args: { rounded: 'card' },
  render: (args) => ({
    components: { UiSkeleton },
    setup: () => ({ args }),
    template: '<UiSkeleton v-bind="args" class="h-40 w-72" />',
  }),
}

/** A product row of the directory on its way: the photograph, the name, the brand. */
export const AProductRow: Story = {
  render: () => ({
    components: { UiSkeleton },
    template: `
      <div class="flex max-w-xl items-center gap-4">
        <UiSkeleton rounded="card" class="size-16 shrink-0" />
        <div class="flex flex-1 flex-col gap-2">
          <UiSkeleton class="h-4 w-3/4" />
          <UiSkeleton class="h-3 w-1/3" />
        </div>
      </div>
    `,
  }),
}
