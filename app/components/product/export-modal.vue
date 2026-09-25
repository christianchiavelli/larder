<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'
import { FULL_DATASET_URL, exportVerdict, type ExportVerdict } from '#shared/domain/export'
import type { NovaFilterValue, NutriScore } from '#shared/domain/nutrition'
import {
  FACET_FIELD_OF,
  MAX_TRACKED_HITS,
  TAG_DIMENSIONS,
  productQuerySchema,
  type ProductQuery,
  type ProductSearchResult,
  type TagDimension,
} from '#shared/domain/search'
import { humanizeTagId, toFilterValue } from '#shared/domain/taxonomy'
import { productExportUrl } from '~/api/products'

interface Tag {
  value: string
  label: string
}

const props = defineProps<{
  facets: ProductSearchResult['facets'] | null
}>()

const open = defineModel<boolean>('open', { required: true })

const { query } = useProductQuery()

const termId = useId()
const term = ref('')
const appliedTerm = ref('')
const tags = reactive<Record<TagDimension, Tag[]>>({
  category: [],
  brand: [],
  country: [],
  label: [],
})
const nutriScore = ref<NutriScore[]>([])
const nova = ref<NovaFilterValue[]>([])

watchDebounced(
  term,
  (value) => {
    appliedTerm.value = value
  },
  { debounce: 350 },
)

function labelFor(dimension: TagDimension, id: string): string {
  const facet = props.facets?.[FACET_FIELD_OF[dimension]] ?? []
  const known = facet.find((item) => toFilterValue(dimension, item.key) === id)
  return known?.label ?? humanizeTagId(id)
}

function startFromPage() {
  const current = query.value

  term.value = current.q
  appliedTerm.value = current.q
  settledTerm.value = current.q
  for (const dimension of TAG_DIMENSIONS) {
    tags[dimension] = current[dimension].map((id) => ({
      value: id,
      label: labelFor(dimension, id),
    }))
  }
  nutriScore.value = [...current.nutriScore]
  nova.value = [...current.nova]
}

watch(open, (isOpen) => {
  if (isOpen) startFromPage()
})

function toggled<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value]
}

const draft = computed<ProductQuery>(() =>
  productQuerySchema.parse({
    q: appliedTerm.value,
    category: tags.category.map((tag) => tag.value),
    brand: tags.brand.map((tag) => tag.value),
    country: tags.country.map((tag) => tag.value),
    label: tags.label.map((tag) => tag.value),
    nutriScore: nutriScore.value,
    nova: nova.value,
    sort: query.value.sort,
  }),
)

const { state, asyncStatus, isPlaceholderData, refetch } = useProductCount(draft, () => open.value)

const count = computed(() => state.value.data)
const verdict = computed(() => (count.value ? exportVerdict(count.value) : null))

const isPending = computed(
  () =>
    term.value !== appliedTerm.value || asyncStatus.value === 'loading' || isPlaceholderData.value,
)

const settledTerm = ref('')

watch(isPending, (pending) => {
  if (!pending) settledTerm.value = appliedTerm.value
})

const isTermPending = computed(
  () =>
    term.value !== appliedTerm.value ||
    (isPending.value && appliedTerm.value !== settledTerm.value),
)

const hasFailed = computed(() => state.value.status === 'error' && !isPending.value)

const STATUS_ICONS = {
  ready: { name: 'circle-check', tone: 'text-nova-1' },
  'too-many': { name: 'circle-info', tone: 'text-ink-accent' },
  empty: { name: 'circle-info', tone: 'text-ink-subtle' },
} as const satisfies Record<ExportVerdict, { name: IconName; tone: string }>

const headline = computed(() => {
  const current = count.value
  if (!current) return 'Counting products'
  if (verdict.value === 'too-many') return `${formatCount(MAX_TRACKED_HITS)}+ products`
  if (verdict.value === 'empty') return 'No products match'
  return `${formatCount(current.totalCount)} ${current.totalCount === 1 ? 'product' : 'products'}`
})

const caption = computed(() => {
  if (!count.value) return 'This takes a moment'
  if (verdict.value === 'too-many') return `A file holds up to ${formatCount(MAX_TRACKED_HITS)}`
  if (verdict.value === 'empty') return 'Remove a filter to widen the search'
  return 'Every one of them, one row each'
})

const isDownloadable = computed(
  () => !isPending.value && state.value.status === 'success' && verdict.value === 'ready',
)

const href = computed(() => productExportUrl(draft.value))

function onDownload(event: MouseEvent) {
  if (!isDownloadable.value) {
    event.preventDefault()
    return
  }
  open.value = false
}
</script>

<template>
  <UiModal
    v-model:open="open"
    title="Export to CSV"
    description="Choose the products that go in the file. It starts from the search you were looking at."
  >
    <div class="flex flex-col gap-5">
      <div class="flex flex-col gap-2">
        <label :for="termId" class="text-overline text-ink-subtle uppercase"
          >Contains the word</label
        >
        <div
          class="flex h-10 items-center gap-2.5 rounded-control border border-edge bg-surface-raised px-3 transition-colors focus-within:border-edge-accent hover:border-edge-strong"
          data-testid="export-term-field"
        >
          <UiIcon name="search" class="size-3.5 shrink-0 text-ink-subtle" />
          <input
            :id="termId"
            v-model="term"
            type="text"
            maxlength="120"
            autocomplete="off"
            placeholder="Any word in the name, brand or ingredients"
            class="min-w-0 flex-1 bg-transparent text-body text-ink placeholder:text-ink-subtle focus:outline-none"
          />
          <UiSpinner v-if="isTermPending" class="reveal size-3.5 shrink-0 text-ink-accent" />
        </div>
      </div>

      <div class="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
        <ProductTaxonomyField
          v-for="dimension in TAG_DIMENSIONS"
          :key="dimension"
          v-model="tags[dimension]"
          :taxonomy="dimension"
          :scope="draft"
        />

        <fieldset class="border-0 p-0">
          <legend class="mb-2 text-overline text-ink-subtle uppercase">Nutri-Score</legend>
          <ProductNutriScorePicker
            :selected="nutriScore"
            @toggle="nutriScore = toggled(nutriScore, $event)"
          />
        </fieldset>

        <fieldset class="border-0 p-0">
          <legend class="mb-2 text-overline text-ink-subtle uppercase">Processing (NOVA)</legend>
          <ProductNovaPicker :selected="nova" @toggle="nova = toggled(nova, $event)" />
        </fieldset>
      </div>

      <div
        v-if="verdict === 'too-many'"
        class="reveal flex gap-3 rounded-card bg-surface-accent px-4 py-3.5 text-label font-normal text-ink"
        data-testid="export-too-many"
      >
        <UiIcon name="circle-info" class="mt-0.5 size-4 shrink-0 text-ink-accent" />
        <div class="flex flex-col gap-1.5">
          <p>
            <strong class="font-semibold">
              More than {{ formatCount(MAX_TRACKED_HITS) }} products match.
            </strong>
            Add a filter to bring it under the limit, and every one of them goes in the file.
          </p>
          <p class="text-ink-muted">
            Need everything?
            <a
              :href="FULL_DATASET_URL"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 font-semibold text-ink-accent underline underline-offset-2"
            >
              Get the full Open Food Facts dataset (about 1.3 GB)
              <UiIcon name="arrow-up-right-from-square" class="size-2.5" />
            </a>
          </p>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center gap-4 max-sm:flex-col max-sm:items-stretch">
        <div
          class="grid min-w-0 grid-cols-[auto_1fr] items-center gap-x-2"
          aria-live="polite"
          data-testid="export-count"
        >
          <template v-if="hasFailed">
            <UiIcon name="circle-info" class="size-3.5 text-danger" />
            <p class="text-subheading text-danger">Could not count the products</p>
            <button
              type="button"
              class="col-start-2 justify-self-start text-caption text-ink-accent underline underline-offset-2"
              @click="refetch()"
            >
              Try again
            </button>
          </template>

          <template v-else>
            <UiSpinner v-if="isPending || !verdict" class="size-3.5 text-ink-accent" />
            <UiIcon
              v-else
              :name="STATUS_ICONS[verdict].name"
              class="reveal size-3.5"
              :class="STATUS_ICONS[verdict].tone"
            />
            <p
              :key="headline"
              class="reveal text-subheading"
              :class="[count ? 'text-ink' : 'text-ink-muted', isPending && count && 'opacity-60']"
              data-numeric
            >
              {{ headline }}
            </p>
            <p :key="caption" class="reveal col-start-2 text-caption text-ink-subtle">
              {{ caption }}
            </p>
          </template>
        </div>

        <div class="ml-auto flex gap-2 max-sm:ml-0">
          <button
            type="button"
            class="inline-flex h-9 items-center justify-center rounded-control border border-edge-strong bg-surface-raised px-4 text-label text-ink transition-colors hover:bg-surface-hover max-sm:h-11 max-sm:flex-1"
            @click="open = false"
          >
            Cancel
          </button>
          <a
            :href="isDownloadable ? href : undefined"
            :role="isDownloadable ? undefined : 'link'"
            :aria-disabled="isDownloadable ? undefined : 'true'"
            download
            class="inline-flex h-9 items-center justify-center gap-2 rounded-control bg-accent px-4 text-label text-ink-on-accent transition-colors hover:bg-accent-hover aria-disabled:cursor-not-allowed aria-disabled:opacity-45 aria-disabled:hover:bg-accent max-sm:h-11 max-sm:flex-1"
            @click="onDownload"
          >
            <UiIcon name="download" class="size-3.5" />
            Download CSV
          </a>
        </div>
      </div>
    </template>
  </UiModal>
</template>
