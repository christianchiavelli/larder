<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

useAppHead()

const { t } = useI18n()
const route = useRoute()

useHead(() => ({
  title: t(props.error.statusCode === 404 ? 'errors.notFound.title' : 'errors.failed.title'),
}))

const retrying = ref(false)

/** The same address again, now that whatever failed may have recovered. */
async function retry() {
  retrying.value = true
  try {
    await clearError({ redirect: route.fullPath })
  } finally {
    retrying.value = false
  }
}
</script>

<template>
  <div class="min-h-dvh bg-surface text-ink">
    <NuxtLayout>
      <ChromeErrorView
        :status-code="error.statusCode ?? 500"
        :path="route.path"
        :retrying="retrying"
        @retry="retry"
      />
    </NuxtLayout>
  </div>
</template>
