<script setup lang="ts">
/**
 * Page navigation.
 *
 * Renders a fixed-width window of page numbers with ellipses, so the control
 * does not change width as the user moves through the set. A pager that
 * reflows every time you click it is a pager that is hard to click twice.
 */
const props = withDefaults(
  defineProps<{
    page: number
    pageCount: number
    /** Page numbers shown either side of the current one. */
    siblings?: number
    disabled?: boolean
  }>(),
  { siblings: 1, disabled: false },
)

const emit = defineEmits<{ change: [page: number] }>()

type PageEntry = { type: 'page'; value: number } | { type: 'gap'; key: string }

const entries = computed<PageEntry[]>(() => {
  const { page, pageCount, siblings } = props
  if (pageCount <= 1) return []

  // First, last, current, and `siblings` either side. A Set removes the
  // overlap that occurs near the ends without any special-casing.
  const window = new Set<number>([1, pageCount, page])
  for (let offset = 1; offset <= siblings; offset++) {
    if (page - offset >= 1) window.add(page - offset)
    if (page + offset <= pageCount) window.add(page + offset)
  }

  const sorted = [...window].sort((a, b) => a - b)
  const result: PageEntry[] = []

  for (const [index, value] of sorted.entries()) {
    const previous = sorted[index - 1]
    // A gap of exactly one is rendered as the number itself: an ellipsis
    // hiding a single page is longer than the page it hides.
    if (previous !== undefined && value - previous === 2) {
      result.push({ type: 'page', value: previous + 1 })
    } else if (previous !== undefined && value - previous > 2) {
      result.push({ type: 'gap', key: `gap-${previous}` })
    }
    result.push({ type: 'page', value })
  }

  return result
})

function go(page: number) {
  if (props.disabled || page === props.page || page < 1 || page > props.pageCount) return
  emit('change', page)
}
</script>

<template>
  <nav
    v-if="entries.length > 0"
    aria-label="Pagination"
    class="flex items-center justify-center gap-1"
  >
    <button
      type="button"
      class="rounded-control border border-edge-subtle px-2.5 py-1.5 text-label text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent motion-reduce:transition-none"
      :disabled="disabled || page <= 1"
      aria-label="Previous page"
      @click="go(page - 1)"
    >
      &larr;
    </button>

    <template v-for="entry in entries" :key="entry.type === 'page' ? entry.value : entry.key">
      <span v-if="entry.type === 'gap'" class="px-1 text-label text-ink-subtle" aria-hidden="true">
        &hellip;
      </span>

      <button
        v-else
        type="button"
        class="min-w-9 rounded-control border px-2.5 py-1.5 text-label transition-colors disabled:cursor-not-allowed motion-reduce:transition-none"
        :class="
          entry.value === page
            ? 'border-edge-accent bg-surface-accent text-ink-accent'
            : 'border-edge-subtle text-ink-muted hover:bg-surface-hover hover:text-ink'
        "
        :aria-current="entry.value === page ? 'page' : undefined"
        :aria-label="`Page ${entry.value}`"
        :disabled="disabled"
        @click="go(entry.value)"
      >
        <span data-numeric>{{ entry.value }}</span>
      </button>
    </template>

    <button
      type="button"
      class="rounded-control border border-edge-subtle px-2.5 py-1.5 text-label text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent motion-reduce:transition-none"
      :disabled="disabled || page >= pageCount"
      aria-label="Next page"
      @click="go(page + 1)"
    >
      &rarr;
    </button>
  </nav>
</template>
