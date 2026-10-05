import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import UiSurfaceCard from '~~/layers/ui/app/components/surface-card.vue'
import type { FacetItem } from '#shared/domain/search'
import { toTaxonomyTag } from '#shared/domain/taxonomy'
import ProductFacetChart from './facet-chart.vue'

/**
 * Facets as Open Food Facts' search returned them on 5 October 2026, `[key,
 * name, count]`, named the way the server names them.
 */
function facet(items: ReadonlyArray<readonly [string, string, number]>): FacetItem[] {
  return items.map(([key, name, count]) => ({ key, label: toTaxonomyTag(key, name).label, count }))
}

const CATEGORIES = facet([
  ['en:plant-based-foods-and-beverages', 'Plant-based foods and beverages', 484_736],
  ['en:plant-based-foods', 'Plant-based foods', 422_246],
  ['en:snacks', 'Snacks', 290_398],
  ['en:sweet-snacks', 'Sugary snacks', 213_883],
  ['en:beverages', 'Drinks', 184_159],
  ['en:dairies', 'Milk products', 155_856],
  ['en:cereals-and-potatoes', 'Cereals and potatoes', 145_087],
  ['en:meats-and-their-products', 'Meat-based products', 138_782],
  ['en:fermented-foods', 'Fermented foods', 121_528],
])

const BRANDS = facet([
  ['carrefour', 'carrefour', 29_156],
  ['bonarea', 'bonarea', 23_900],
  ['auchan', 'auchan', 20_083],
  ['lidl', 'lidl', 15_652],
  ['coop', 'coop', 14_454],
  ['nestle', 'nestle', 14_411],
  ['aldi', 'aldi', 11_960],
  ['u', 'u', 10_610],
  ['hacendado', 'hacendado', 9_955],
])

/** The largest values of one facet, longest bar first, as the overview charts them. */
const meta = {
  title: 'Product/Facet chart',
  component: ProductFacetChart,
  args: { title: 'Categories', items: CATEGORIES, limit: 8, loading: false },
  argTypes: { items: { control: false } },
  // On a card, as on the overview.
  decorators: [
    () => ({
      components: { UiSurfaceCard },
      template: '<UiSurfaceCard class="max-w-2xl"><story /></UiSurfaceCard>',
    }),
  ],
} satisfies Meta<typeof ProductFacetChart>

export default meta
type Story = StoryObj<typeof meta>

/** The catalogue's largest categories; the ninth falls past the limit. */
export const Categories: Story = {}

/** Its largest brands, named from their tags. */
export const Brands: Story = { args: { title: 'Brands', items: BRANDS } }

/** While the facets are on their way. */
export const Loading: Story = { args: { items: [], loading: true } }
