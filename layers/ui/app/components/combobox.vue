<script setup lang="ts">
interface Option {
  value: string
  label: string
  count?: number
}

const props = withDefaults(
  defineProps<{
    label: string
    placeholder: string
    searchLabel: string
    options: readonly Option[]
    allLabel?: string
    status?: string | null
    loading?: boolean
  }>(),
  { allLabel: undefined, status: null, loading: false },
)

const selected = defineModel<Option[]>({ required: true })
const search = defineModel<string>('search', { required: true })
const isOpen = defineModel<boolean>('open', { default: false })

const id = useId()
const labelId = `${id}-label`
const valueId = `${id}-value`
const popoverId = `${id}-popover`
const listboxId = `${id}-listbox`
const anchor = `--combobox-${id}`

const trigger = useTemplateRef<HTMLButtonElement>('trigger')
const popover = useTemplateRef<HTMLElement>('popover')
const input = useTemplateRef<HTMLInputElement>('input')

const activeIndex = ref(-1)

const selectedValues = computed(() => new Set(selected.value.map((option) => option.value)))
const isBrowsing = computed(() => search.value.trim() === '')

const entries = computed<Option[]>(() => {
  if (!isBrowsing.value) return [...props.options]

  const listed = new Set(props.options.map((option) => option.value))
  const unlisted = selected.value.filter((option) => !listed.has(option.value))

  return [...unlisted, ...props.options]
})

const summary = computed(() =>
  selected.value.length === 0
    ? props.placeholder
    : selected.value.map((option) => option.label).join(', '),
)

const optionId = (index: number) => `${id}-option-${index}`

watch(
  () => entries.value.map((entry) => entry.value).join(','),
  () => {
    activeIndex.value = entries.value.length > 0 ? 0 : -1
  },
)

function isChecked(entry: Option): boolean {
  return selectedValues.value.has(entry.value)
}

function choose(entry: Option) {
  selected.value = selectedValues.value.has(entry.value)
    ? selected.value.filter((option) => option.value !== entry.value)
    : [...selected.value, { value: entry.value, label: entry.label }]
}

function clear() {
  selected.value = []
  input.value?.focus()
}

function remove(option: Option) {
  selected.value = selected.value.filter((entry) => entry.value !== option.value)
  trigger.value?.focus()
}

function move(delta: number) {
  const count = entries.value.length
  if (count === 0) return
  activeIndex.value = (activeIndex.value + delta + count) % count
}

function onKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      move(1)
      break
    case 'ArrowUp':
      event.preventDefault()
      move(-1)
      break
    case 'Enter': {
      const entry = entries.value[activeIndex.value]
      if (!entry) return
      event.preventDefault()
      choose(entry)
      break
    }
  }
}

function onToggle() {
  const opened = popover.value?.matches(':popover-open') ?? false
  isOpen.value = opened

  if (opened) {
    activeIndex.value = entries.value.length > 0 ? 0 : -1
    input.value?.focus()
    return
  }

  search.value = ''
  const focusIsLost =
    document.activeElement === document.body || popover.value?.contains(document.activeElement)
  if (focusIsLost) trigger.value?.focus()
}
</script>

<template>
  <div class="flex min-w-0 flex-col gap-2">
    <span :id="labelId" class="text-overline text-ink-subtle uppercase">{{ label }}</span>

    <div
      class="relative min-h-10 rounded-control border bg-surface-raised transition-colors"
      :class="isOpen ? 'border-edge-accent' : 'border-edge hover:border-edge-strong'"
      :style="`anchor-name: ${anchor}`"
    >
      <button
        ref="trigger"
        type="button"
        class="absolute inset-0 rounded-control"
        :popovertarget="popoverId"
        aria-haspopup="dialog"
        :aria-expanded="isOpen"
        :aria-labelledby="`${labelId} ${valueId}`"
      />

      <div
        class="pointer-events-none relative flex min-h-[inherit] flex-wrap items-center gap-1.5 py-1.5 pr-9 pl-3"
      >
        <span v-if="selected.length === 0" class="text-body text-ink-muted">{{ placeholder }}</span>

        <span
          v-for="option in selected"
          :key="option.value"
          class="reveal inline-flex max-w-full items-center gap-1 rounded-pill border border-edge-subtle bg-surface-sunken py-0.5 pr-1 pl-2.5 text-caption font-semibold text-ink"
        >
          <span class="truncate">{{ option.label }}</span>
          <button
            type="button"
            class="pointer-events-auto inline-flex size-4 shrink-0 items-center justify-center rounded-pill text-ink-subtle transition-colors hover:bg-surface-selected hover:text-ink"
            :aria-label="`Remove ${option.label}`"
            @click="remove(option)"
          >
            <UiIcon name="xmark" class="size-2.5" />
          </button>
        </span>
      </div>

      <span :id="valueId" class="sr-only">{{ summary }}</span>

      <UiIcon
        name="chevron-down"
        class="pointer-events-none absolute top-1/2 right-3 size-3 -translate-y-1/2 text-ink-subtle transition-transform"
        :class="isOpen && 'rotate-180'"
      />
    </div>

    <div
      :id="popoverId"
      ref="popover"
      popover="auto"
      role="dialog"
      :aria-labelledby="labelId"
      class="anchored-below -translate-y-1 rounded-card border border-edge bg-surface-overlay p-1.5 text-ink opacity-0 shadow-overlay transition-[opacity,translate,display,overlay] transition-discrete duration-(--duration-enter) open:translate-y-0 open:opacity-100 starting:open:-translate-y-1 starting:open:opacity-0"
      :style="`position-anchor: ${anchor}`"
      @toggle="onToggle"
    >
      <div
        class="mb-1 flex h-9 items-center gap-2 rounded-control border border-edge-accent bg-surface-raised px-2.5"
      >
        <UiIcon name="search" class="size-3 shrink-0 text-ink-subtle" />
        <input
          ref="input"
          v-model="search"
          type="text"
          role="combobox"
          autofocus
          autocomplete="off"
          aria-autocomplete="list"
          aria-expanded="true"
          :aria-label="searchLabel"
          :aria-controls="listboxId"
          :aria-activedescendant="activeIndex >= 0 ? optionId(activeIndex) : undefined"
          :placeholder="searchLabel"
          class="min-w-0 flex-1 bg-transparent text-body text-ink placeholder:text-ink-subtle focus:outline-none"
          @keydown="onKeydown"
        />
        <UiSpinner v-if="loading" class="reveal size-3.5 shrink-0 text-ink-accent" />
      </div>

      <div
        v-if="allLabel || selected.length > 0"
        class="mb-1 flex min-h-7 items-center justify-between gap-2 px-2 text-caption"
      >
        <span v-if="selected.length === 0" class="reveal text-ink-subtle">{{ allLabel }}</span>
        <template v-else>
          <span class="reveal text-ink-muted" data-numeric>{{ selected.length }} selected</span>
          <button
            type="button"
            class="reveal rounded-control px-1 text-ink-accent underline underline-offset-2 transition-colors hover:text-accent-hover"
            @click="clear"
          >
            Clear
          </button>
        </template>
      </div>

      <ul
        :id="listboxId"
        role="listbox"
        aria-multiselectable="true"
        :aria-labelledby="labelId"
        :aria-busy="loading || undefined"
        class="max-h-64 overflow-y-auto"
      >
        <li
          v-for="(entry, index) in entries"
          :id="optionId(index)"
          :key="entry.value"
          role="option"
          :aria-selected="isChecked(entry)"
          :aria-label="
            entry.count === undefined ? undefined : `${entry.label}, ${formatCount(entry.count)}`
          "
          class="reveal flex cursor-pointer items-center gap-2.5 rounded-control px-2 py-1.5 text-label"
          :class="index === activeIndex ? 'bg-surface-hover text-ink-accent' : 'text-ink'"
          @mouseenter="activeIndex = index"
          @mousedown.prevent
          @click="choose(entry)"
        >
          <span
            class="inline-flex size-4 shrink-0 items-center justify-center rounded-[0.1875rem] border transition-colors"
            :class="
              isChecked(entry)
                ? 'border-accent bg-accent text-ink-on-accent'
                : 'border-edge-strong bg-surface-raised'
            "
            aria-hidden="true"
          >
            <UiIcon v-if="isChecked(entry)" name="check" class="size-2.5" />
          </span>
          <span class="min-w-0 flex-1 truncate">{{ entry.label }}</span>
          <span
            v-if="entry.count !== undefined"
            class="shrink-0 text-caption font-normal tabular-nums"
            :class="index === activeIndex ? 'text-ink-muted' : 'text-ink-subtle'"
            :title="formatCount(entry.count)"
            aria-hidden="true"
            data-numeric
          >
            {{ formatCountCompact(entry.count) }}
          </span>
        </li>
      </ul>

      <p v-if="status" role="status" class="px-2 py-1.5 text-caption text-ink-subtle">
        {{ status }}
      </p>
    </div>
  </div>
</template>
