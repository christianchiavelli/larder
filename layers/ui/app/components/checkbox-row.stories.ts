import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { ref } from 'vue'
import UiCheckboxRow from './checkbox-row.vue'

/** A checkbox and what it stands for, the whole row a target, as in the directory's filters. */
const meta = {
  title: 'Design system/Checkbox row',
  component: UiCheckboxRow,
  args: { checked: false },
  render: (args) => ({
    components: { UiCheckboxRow },
    setup() {
      const checked = ref(args.checked)
      return { checked }
    },
    template: `
      <div class="max-w-xs">
        <UiCheckboxRow :checked="checked" @toggle="checked = !checked">
          <span class="flex-1 text-body text-ink">Organic</span>
        </UiCheckboxRow>
      </div>
    `,
  }),
} satisfies Meta<typeof UiCheckboxRow>

export default meta
type Story = StoryObj<typeof meta>

/** Not picked. */
export const Unchecked: Story = {}

/** Picked. */
export const Checked: Story = { args: { checked: true } }
