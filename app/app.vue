<script setup lang="ts">
useAppHead()
</script>

<template>
  <div class="min-h-dvh bg-surface text-ink">
    <NuxtRouteAnnouncer />
    <NuxtLoadingIndicator color="var(--accent-solid)" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
