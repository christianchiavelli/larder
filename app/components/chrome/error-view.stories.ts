import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { expect, fn, waitFor } from 'storybook/test'
import ChromeErrorView from './error-view.vue'

/**
 * What the app shows in place of a page it could not show, centred in the
 * space the page would have filled: the design system's empty and error
 * states, each with the way back.
 */
const meta = {
  title: 'Chrome/Error view',
  component: ChromeErrorView,
  args: { statusCode: 404, path: '/products/not-a-page', retrying: false, onRetry: fn() },
  // As in the shell, where it fills the column a page would have filled.
  decorators: [() => ({ template: '<div class="flex min-h-[30rem] flex-col"><story /></div>' })],
} satisfies Meta<typeof ChromeErrorView>

export default meta
type Story = StoryObj<typeof meta>

/** An address nothing answers to, quoted as it was asked for, and the two ways out. */
export const NotFound: Story = {
  play: async ({ canvas }) => {
    // The message fades in, so it is visible once that has run.
    await waitFor(() => expect(canvas.getByText('/products/not-a-page')).toBeVisible())
    await expect(canvas.getByRole('link', { name: 'Search the catalogue' })).toHaveAttribute(
      'href',
      '/products',
    )
    await expect(canvas.getByRole('link', { name: 'Go to the front page' })).toHaveAttribute(
      'href',
      '/',
    )
  },
}

/** A page that failed to render: try it again, or start from the front page. */
export const Failed: Story = {
  args: { statusCode: 500 },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Try again' }))
    await expect(args.onRetry).toHaveBeenCalledOnce()
  },
}

/** While the retry is on its way. */
export const Retrying: Story = { args: { statusCode: 500, retrying: true } }
