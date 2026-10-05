import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { ref, type FunctionalComponent } from 'vue'
import UiSelectField from './select-field.vue'

const ORDERS = [
  { value: 'popularity', label: 'Most scanned' },
  { value: 'nutriscore', label: 'Best Nutri-Score' },
  { value: 'name', label: 'Name' },
]

/** The field over the orders here, whose values are strings. */
type Props = {
  options: typeof ORDERS
  modelValue: string
  label?: string
  ariaLabel?: string
  disabled?: boolean
}

// Generic over its values, which Storybook's types cannot follow yet
// (storybookjs/storybook#24238), so they get the field as it is here.
const SelectField = UiSelectField as FunctionalComponent<Props>

/** The platform's own select, dressed in the design system, for a short list of choices. */
const meta = {
  title: 'Design system/Select field',
  component: SelectField,
  args: { label: 'Sort by', options: ORDERS, modelValue: 'popularity', disabled: false },
  argTypes: { options: { control: false }, modelValue: { control: false } },
  render: (args) => ({
    components: { UiSelectField },
    setup() {
      const { modelValue, ...rest } = args
      const value = ref(modelValue)
      return { rest, value }
    },
    template: '<UiSelectField v-bind="rest" v-model="value" />',
  }),
} satisfies Meta<typeof SelectField>

export default meta
type Story = StoryObj<typeof meta>

/** With its label beside it. */
export const Labelled: Story = {}

/** Named only for screen readers, where the label would repeat the heading above it. */
export const NamedOnly: Story = { args: { label: undefined, ariaLabel: 'Sort the products by' } }

/** While the page loads, it cannot change. */
export const Disabled: Story = { args: { disabled: true } }
