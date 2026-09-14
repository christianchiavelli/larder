<script setup lang="ts">
/**
 * The state a view shows when it has nothing to render.
 *
 * `tone` separates the two cases that look identical and are not: a search that
 * legitimately matched nothing, and a request that failed. Presenting an outage
 * as an empty result set is the one failure a reader cannot detect, because
 * "no products match" is a perfectly plausible answer. The error tone says so
 * and offers the retry; the empty tone does not.
 */
withDefaults(
  defineProps<{
    title: string
    description?: string
    tone?: 'empty' | 'error'
  }>(),
  { tone: 'empty' },
)

defineEmits<{ retry: [] }>()
</script>

<template>
  <div
    class="flex flex-col items-center justify-center gap-2 rounded-card border border-dashed px-6 py-12 text-center"
    :class="
      tone === 'error' ? 'border-danger/40 bg-danger-surface' : 'border-edge bg-surface-sunken'
    "
    :role="tone === 'error' ? 'alert' : 'status'"
  >
    <p class="text-subheading" :class="tone === 'error' ? 'text-danger' : 'text-ink'">
      {{ title }}
    </p>

    <p v-if="description" class="max-w-prose text-body text-ink-muted">
      {{ description }}
    </p>

    <slot />

    <button
      v-if="tone === 'error'"
      type="button"
      class="mt-2 rounded-control border border-edge-strong px-3 py-1.5 text-label text-ink transition-colors hover:bg-surface-hover motion-reduce:transition-none"
      @click="$emit('retry')"
    >
      Try again
    </button>
  </div>
</template>
