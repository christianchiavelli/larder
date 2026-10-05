import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { ref } from 'vue'
import UiPagination from './pagination.vue'

/** Pages by number, the first and last always in reach, the rest folded into a gap. */
const meta = {
  title: 'Design system/Pagination',
  component: UiPagination,
  args: { page: 1, pageCount: 12, siblings: 1, disabled: false },
  render: (args) => ({
    components: { UiPagination },
    setup() {
      const { page: start, ...rest } = args
      const page = ref(start)
      return { rest, page }
    },
    template: '<UiPagination v-bind="rest" :page="page" @change="page = $event" />',
  }),
} satisfies Meta<typeof UiPagination>

export default meta
type Story = StoryObj<typeof meta>

/** The first of many pages. */
export const FirstPage: Story = {}

/** Deep in, with a gap on each side. */
export const InTheMiddle: Story = { args: { page: 6 } }

/** Few enough pages to show them all. */
export const FewPages: Story = { args: { page: 2, pageCount: 4 } }

/** While a page loads, nothing can be pressed twice. */
export const Disabled: Story = { args: { page: 3, disabled: true } }
