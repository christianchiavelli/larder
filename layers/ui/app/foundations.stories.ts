import type { Meta, StoryObj } from '@storybook-vue/nuxt'

/**
 * The tokens of `tokens.css`, drawn. Every swatch is the live custom property,
 * so the pages follow the theme picked in the toolbar, and a token changed in
 * the stylesheet changes here with no copy to update.
 */
const meta = {
  title: 'Foundations',
  // Each story is a page of its own already; a docs page would only stack them.
  tags: ['!autodocs'],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

interface Group {
  readonly name: string
  readonly tokens: readonly string[]
}

const SEMANTIC: readonly Group[] = [
  {
    name: 'Surfaces',
    tokens: ['base', 'raised', 'sunken', 'media', 'overlay', 'accent', 'hover', 'selected'].map(
      (step) => `--surface-${step}`,
    ),
  },
  {
    name: 'Chrome',
    tokens: ['base', 'raised', 'content', 'content-strong'].map((step) => `--chrome-${step}`),
  },
  {
    name: 'Borders',
    tokens: ['subtle', 'default', 'strong', 'accent', 'selected'].map((step) => `--border-${step}`),
  },
  {
    name: 'Content',
    tokens: ['primary', 'secondary', 'tertiary', 'accent', 'on-accent'].map(
      (step) => `--content-${step}`,
    ),
  },
  {
    name: 'Accent and status',
    tokens: [
      '--accent-solid',
      '--accent-solid-hover',
      '--accent-muted',
      '--status-danger-surface',
      '--status-danger-content',
      '--focus-ring',
    ],
  },
]

const DATA: readonly Group[] = [
  {
    name: 'Nutri-Score',
    tokens: ['a', 'b', 'c', 'd', 'e', 'ungraded'].map((grade) => `--nutriscore-${grade}`),
  },
  { name: 'NOVA', tokens: ['1', '2', '3', '4', 'unknown'].map((group) => `--nova-${group}`) },
  {
    name: 'Charts',
    tokens: ['1', '2', '3', '4', '5', '6', '7', '8'].map((step) => `--viz-${step}`),
  },
]

const SWATCHES = `
  <div class="flex max-w-5xl flex-col gap-10">
    <section v-for="group in groups" :key="group.name" class="flex flex-col gap-3">
      <h2 class="text-overline text-ink-muted uppercase">{{ group.name }}</h2>
      <ul class="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-x-4 gap-y-5">
        <li v-for="token in group.tokens" :key="token" class="flex flex-col gap-1.5">
          <span class="h-12 rounded-control border border-edge-subtle" :style="{ background: 'var(' + token + ')' }" />
          <code class="text-caption text-ink">{{ token }}</code>
        </li>
      </ul>
    </section>
  </div>
`

/**
 * What each colour is for. The dark theme redefines these under `.dark`, and
 * nothing else changes. Tertiary content, the faintest text, still reaches
 * 4.5:1 on every surface it sits on: the page's base, a card, a sunken well.
 */
export const Colour: Story = {
  render: () => ({ setup: () => ({ groups: SEMANTIC }), template: SWATCHES }),
}

/**
 * The colours data is drawn in. Nutri-Score keeps the scheme's own published
 * colours in both themes, since readers know them; ungraded is its own value,
 * never a grade.
 */
export const DataColour: Story = {
  render: () => ({ setup: () => ({ groups: DATA }), template: SWATCHES }),
}

const TYPE = [
  ['text-title', 'Every packaged food'],
  ['text-lead', 'Nutrition, processing and labelling'],
  ['text-heading', 'Nutrition facts'],
  ['text-subheading', 'Additives'],
  ['text-body', 'Per 100 g, against the EU reference intakes.'],
  ['text-label', 'Sort by'],
  ['text-caption', 'Source: Open Food Facts'],
  ['text-overline', 'Nutri-Score'],
  ['text-metric', '3,585,939'],
  ['text-metric-sm', '56.3 g'],
] as const

/** Open Sans carries the interface, Lora the front page's headline; every style is a utility of its own. */
export const Type: Story = {
  render: () => ({
    setup: () => ({ styles: TYPE }),
    template: `
      <ul class="flex max-w-4xl flex-col gap-4">
        <li v-for="[utility, sample] in styles" :key="utility" class="grid grid-cols-[9rem_1fr] items-baseline gap-4">
          <code class="text-caption text-ink-muted">{{ utility }}</code>
          <span class="text-ink" :class="utility">{{ sample }}</span>
        </li>
      </ul>
    `,
  }),
}

/** Corners by role, and the shadows that lift a card, a menu and a dialog off the page. */
export const ShapeAndDepth: Story = {
  render: () => ({
    template: `
      <div class="flex max-w-4xl flex-col gap-10">
        <section class="flex flex-col gap-3">
          <h2 class="text-overline text-ink-muted uppercase">Radius</h2>
          <ul class="flex flex-wrap gap-6">
            <li class="flex flex-col items-center gap-2"><span class="size-20 rounded-control bg-surface-sunken" /><code class="text-caption text-ink">control</code></li>
            <li class="flex flex-col items-center gap-2"><span class="size-20 rounded-card bg-surface-sunken" /><code class="text-caption text-ink">card</code></li>
            <li class="flex flex-col items-center gap-2"><span class="size-20 rounded-shell bg-surface-sunken" /><code class="text-caption text-ink">shell</code></li>
            <li class="flex flex-col items-center gap-2"><span class="size-20 rounded-pill bg-surface-sunken" /><code class="text-caption text-ink">pill</code></li>
          </ul>
        </section>
        <section class="flex flex-col gap-3">
          <h2 class="text-overline text-ink-muted uppercase">Shadow</h2>
          <ul class="flex flex-wrap gap-8">
            <li class="flex flex-col items-center gap-3"><span class="size-24 rounded-card bg-surface-raised shadow-card" /><code class="text-caption text-ink">card</code></li>
            <li class="flex flex-col items-center gap-3"><span class="size-24 rounded-card bg-surface-raised shadow-raised" /><code class="text-caption text-ink">raised</code></li>
            <li class="flex flex-col items-center gap-3"><span class="size-24 rounded-card bg-surface-raised shadow-overlay" /><code class="text-caption text-ink">overlay</code></li>
          </ul>
        </section>
      </div>
    `,
  }),
}
