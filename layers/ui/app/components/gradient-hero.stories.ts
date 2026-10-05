import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import UiGradientHero from './gradient-hero.vue'

/** The front page's opening: two fields of light that drift, and stand still for reduced motion. */
const meta = {
  title: 'Design system/Gradient hero',
  component: UiGradientHero,
  parameters: { layout: 'fullscreen' },
  render: () => ({
    components: { UiGradientHero },
    template: `
      <UiGradientHero>
        <h1
          class="max-w-3xl font-serif text-[2rem] leading-[1.15] font-semibold text-ink sm:text-[2.75rem] sm:leading-[1.1] lg:text-[3.25rem]"
        >
          Every packaged food, measured the same way
        </h1>
        <p class="mt-4 max-w-xl text-lead text-ink-muted">
          Nutrition, processing and labelling across a public catalogue of
          <span data-numeric class="text-ink">3.5 million</span> products.
        </p>
      </UiGradientHero>
    `,
  }),
} satisfies Meta<typeof UiGradientHero>

export default meta

export const Default: StoryObj<typeof meta> = {}
