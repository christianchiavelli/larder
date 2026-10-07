import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import UiButton from './button.vue'
import UiIcon from './icon.vue'

/** The action a message or a dialog leads to: one primary, and a secondary beside it. */
const meta = {
  title: 'Design system/Button',
  component: UiButton,
  args: { variant: 'primary' },
  argTypes: { variant: { control: 'inline-radio', options: ['primary', 'secondary'] } },
  render: (args) => ({
    components: { UiButton },
    setup: () => ({ args }),
    template: '<UiButton v-bind="args">Browse products</UiButton>',
  }),
} satisfies Meta<typeof UiButton>

export default meta
type Story = StoryObj<typeof meta>

/** What the page most wants the reader to do next. */
export const Primary: Story = {}

/** The way out, beside the primary. */
export const Secondary: Story = { args: { variant: 'secondary' } }

/** With `to`, a button is a link to a page of the app. */
export const AsALink: Story = { args: { to: '/products' } }

/** An icon goes before the words, at the size of the type. */
export const WithAnIcon: Story = {
  render: (args) => ({
    components: { UiButton, UiIcon },
    setup: () => ({ args }),
    template:
      '<UiButton v-bind="args"><UiIcon name="arrow-rotate-right" class="size-3.5" />Try again</UiButton>',
  }),
}

/** The pair a dialog or a failed page ends with. */
export const Together: Story = {
  render: () => ({
    components: { UiButton },
    template: `
      <div class="flex flex-wrap gap-2">
        <UiButton variant="secondary">Cancel</UiButton>
        <UiButton>Download CSV</UiButton>
      </div>`,
  }),
}
