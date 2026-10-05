import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { ICONS, type IconName } from '../utils/icons'
import UiIcon from './icon.vue'

const NAMES = Object.keys(ICONS) as IconName[]

/** An icon from the app's own set, decorative unless given a label. */
const meta = {
  title: 'Design system/Icon',
  component: UiIcon,
  args: { name: 'search' },
  argTypes: { name: { control: 'select', options: NAMES } },
} satisfies Meta<typeof UiIcon>

export default meta
type Story = StoryObj<typeof meta>

/** Every icon the app registers, and nothing it does not use. */
export const TheSet: Story = {
  render: () => ({
    components: { UiIcon },
    setup: () => ({ names: NAMES }),
    template: `
      <ul class="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-x-4 gap-y-6">
        <li v-for="name in names" :key="name" class="flex flex-col items-center gap-2">
          <UiIcon :name="name" class="size-6 text-ink" />
          <code class="text-caption text-ink-muted">{{ name }}</code>
        </li>
      </ul>
    `,
  }),
}

/** Beside a word an icon only repeats it, so screen readers skip it. */
export const BesideAWord: Story = {
  render: (args) => ({
    components: { UiIcon },
    setup: () => ({ args }),
    template:
      '<span class="inline-flex items-center gap-2 text-body text-ink"><UiIcon v-bind="args" class="size-4" /> Search</span>',
  }),
}

/** On its own, it carries a label and reads as an image. */
export const OnItsOwn: Story = { args: { name: 'circle-info', label: 'About the data' } }
