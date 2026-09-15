<script setup lang="ts" generic="T extends string | number">
/**
 * A styled select.
 *
 * This is a real `<select>`, not a listbox rebuilt out of divs. The customizable
 * select API (`appearance: base-select`) lets the button *and* the open picker
 * be styled while the element stays a select, so keyboard navigation, type-ahead,
 * screen reader semantics, form association and the native picker on touch
 * devices all keep working, because none of them were reimplemented.
 *
 * Support in September 2026: stable in Chrome and Edge, behind a flag in Firefox
 * Nightly, in Safari Technology Preview. Not baseline, which is fine, because
 * the feature is additive by design. A browser without it renders the fallback:
 * the closed control is fully styled either way (`appearance: none` has worked
 * everywhere for years) and only the open list falls back to the platform's own.
 * A plainer dropdown in one browser is a better trade than a JS widget whose
 * accessibility has to be hand-maintained.
 *
 * The alternative considered was a headless library. For a control with three
 * options that means a dependency, a popover layer and a keyboard
 * implementation, to arrive at less than the platform already gives.
 */
const props = withDefaults(
  defineProps<{
    options: ReadonlyArray<{ value: T; label: string }>
    /** Visible label. Omit only when `ariaLabel` names the control instead. */
    label?: string
    ariaLabel?: string
    disabled?: boolean
  }>(),
  { disabled: false },
)

const model = defineModel<T>({ required: true })

const fieldId = useId()

/**
 * Maps the DOM's string back to the option it came from.
 *
 * A `<select>` only ever reports a string, so casting that string to `T` would
 * be a lie for any non-string option: the model would hold `"48"` where the
 * rest of the app expects `48`, and every comparison against it would quietly
 * fail. Looking the value up in the options keeps the caller's own type.
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
      <svg
        class="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-ink-subtle"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>

      <!-- Read by nothing; present so a find-in-page for the current value hits. -->
      <span class="sr-only">{{ selectedLabel }}</span>
    </div>
  </div>
</template>
