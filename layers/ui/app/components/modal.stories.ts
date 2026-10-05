import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { expect, waitFor } from 'storybook/test'
import { ref } from 'vue'
import UiModal from './modal.vue'

/**
 * A modal on the platform's own `<dialog>`: the page behind goes inert, focus
 * moves to the heading, and comes back to what opened it.
 */
const meta = {
  title: 'Design system/Modal',
  component: UiModal,
  args: {
    title: 'Export these products',
    description: 'Every product the search finds, as one CSV file.',
    open: false,
  },
  argTypes: { open: { control: false } },
  // Opened from a button, as in the app: a modal open from the start would cover the docs page.
  render: (args) => ({
    components: { UiModal },
    setup() {
      const { open: _open, ...rest } = args
      const open = ref(false)
      return { rest, open }
    },
    template: `
      <button
        type="button"
        class="inline-flex h-9 items-center justify-center rounded-control bg-accent px-4 text-label text-ink-on-accent"
        @click="open = true"
      >
        Export CSV
      </button>
      <UiModal v-bind="rest" v-model:open="open">
        <p class="text-body text-ink-muted">The body scrolls when it holds more than the screen does.</p>
        <template #footer>
          <button
            type="button"
            class="inline-flex h-9 items-center justify-center rounded-control bg-accent px-4 text-label text-ink-on-accent"
            @click="open = false"
          >
            Done
          </button>
        </template>
      </UiModal>
    `,
  }),
} satisfies Meta<typeof UiModal>

export default meta
type Story = StoryObj<typeof meta>

/** Closed, its button alone. */
export const Closed: Story = {}

/** Open, over an inert page. */
export const Open: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Export CSV' }))
    // It fades in, so it is visible from its first frame on rather than the instant it opens.
    const dialog = canvas.getByRole('dialog', { name: 'Export these products' })
    await waitFor(() => expect(dialog).toBeVisible())
  },
}
