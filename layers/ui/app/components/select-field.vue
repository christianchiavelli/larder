<script setup lang="ts" generic="T extends string | number">
const props = withDefaults(
  defineProps<{
    options: ReadonlyArray<{ value: T; label: string }>
    label?: string
    ariaLabel?: string
    disabled?: boolean
  }>(),
  { disabled: false },
)

const model = defineModel<T>({ required: true })

const fieldId = useId()

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
        <option v-for="option in options" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>

      <UiIcon
        name="chevron-down"
        class="pointer-events-none absolute top-1/2 right-2.5 size-3 -translate-y-1/2 text-ink-subtle"
      />

      <span class="sr-only">{{ selectedLabel }}</span>
    </div>
  </div>
</template>
