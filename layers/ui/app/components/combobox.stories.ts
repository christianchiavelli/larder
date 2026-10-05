import type { Meta, StoryObj } from '@storybook-vue/nuxt'
import { computed, ref } from 'vue'
import UiCombobox from './combobox.vue'
import UiSurfaceCard from './surface-card.vue'

// Illustrative brands and counts.
const BRANDS = [
  { value: 'lindt', label: 'Lindt', count: 1204 },
  { value: 'milka', label: 'Milka', count: 889 },
  { value: 'cote-d-or', label: "Côte d'Or", count: 512 },
  { value: 'ritter-sport', label: 'Ritter Sport', count: 437 },
  { value: 'kinder', label: 'Kinder', count: 306 },
]

/**
 * Several choices from a long list, searched as you type: what is picked stays
 * in view, and each option says how many products it holds.
 */
const meta = {
  title: 'Design system/Combobox',
  component: UiCombobox,
  args: {
    label: 'Brand',
    placeholder: 'Any brand',
    searchLabel: 'Search brands',
    options: BRANDS,
    modelValue: [],
    search: '',
  },
  argTypes: {
    options: { control: false },
    modelValue: { control: false },
    search: { control: false },
  },
  render: (args) => ({
    components: { UiCombobox },
    setup() {
      const { modelValue, search: typed, options: _all, ...rest } = args
      const selected = ref([...modelValue])
      const search = ref(typed)
      // The app asks the search for options; here the list is filtered in place.
      const options = computed(() =>
        BRANDS.filter((brand) => brand.label.toLowerCase().includes(search.value.toLowerCase())),
      )
      return { rest, selected, search, options }
    },
    template:
      '<UiCombobox v-bind="rest" :options="options" v-model="selected" v-model:search="search" />',
  }),
  // On white, as in the export dialog, where the app uses it: its quieter text is set for that surface.
  decorators: [
    () => ({
      components: { UiSurfaceCard },
      template: '<UiSurfaceCard class="max-w-sm" padding="lg"><story /></UiSurfaceCard>',
    }),
  ],
} satisfies Meta<typeof UiCombobox>

export default meta
type Story = StoryObj<typeof meta>

/** Nothing picked yet. */
export const Empty: Story = {}

/** Two brands picked, each removable on its own. */
export const TwoPicked: Story = { args: { modelValue: [BRANDS[0]!, BRANDS[1]!] } }
