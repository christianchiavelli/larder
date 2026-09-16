<script setup lang="ts" generic="T extends string | number">
/**
 * A real `<select>`, so keyboard, type-ahead, screen reader semantics, form
 * association and the touch picker keep working. `appearance: base-select`
 * styles the open picker where it exists, and is additive.
 */
const props = withDefaults(
  defineProps<{
    options: ReadonlyArray<{ value: T; label: string }>
    /** Omit only when `ariaLabel` names the control instead. */
    label?: string
    ariaLabel?: string
    disabled?: boolean
  }>(),
  { disabled: false },
)

const model = defineModel<T>({ required: true })

const fieldId = useId()

/**
 * A `<select>` only reports strings, so casting to `T` would put `"48"` where
 * the app expects `48`. The value is looked up in the options instead.
 */
function onChange(event: Event) {
  const raw = (event.target as HTMLSelectElement).value
  const option = props.options.find((candidate) => String(candidate.value) === raw)
  if (option) model.value = option.value
}

const selectedLabel = computed(
  () => props.options.find((option) => option.value === model.value)?.label ?? '',
)
</script>

<template>
  <div class="flex items-center gap-2">
    <label v-if="label" :for="fieldId" class="shrink-0 text-label text-ink-muted">
      {{ label }}
    </label>

    <div class="relative inline-flex">
      <select
        :id="fieldId"
        class="ui-select"
        :value="model"
        :disabled="disabled"
        :aria-label="ariaLabel"
        @change="onChange"
      >
        <!--
          Only rendered by browsers that implement the customizable select; the
          rest ignore both tags and draw their own button. `<selectedcontent>`
          mirrors the chosen option, which is what makes the closed state
          stylable at all.
        -->
        <button>
          <selectedcontent></selectedcontent>
        </button>

        <option v-for="option in options" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>

      <!--
        One arrow for both paths, drawn here rather than by `::picker-icon`, so
        it inherits `currentColor` and follows the theme. A data-URI background
        cannot do that, and would need a second copy for dark mode.
      -->
      <UiIcon
        name="chevron-down"
        class="pointer-events-none absolute top-1/2 right-2.5 size-3 -translate-y-1/2 text-ink-subtle"
      />

      <!-- Read by nothing; present so a find-in-page for the current value hits. -->
      <span class="sr-only">{{ selectedLabel }}</span>
    </div>
  </div>
</template>
