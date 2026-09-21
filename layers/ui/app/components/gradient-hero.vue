<template>
  <div class="relative isolate overflow-hidden bg-surface-sunken">
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 -z-10 mx-auto max-w-[86rem] motion-safe:animate-light-in"
    >
      <div class="absolute inset-0 will-change-transform motion-safe:animate-orbit-left">
        <div
          class="light-field absolute top-[40%] left-1/2 size-[clamp(30rem,84vw,62rem)] -translate-x-[68%] -translate-y-1/2 opacity-60 [--light-color:var(--hero-light-primary)]"
        />
      </div>

      <div class="absolute inset-0 will-change-transform motion-safe:animate-orbit-right">
        <div
          class="light-field absolute top-[40%] left-1/2 size-[clamp(14rem,34vw,26rem)] translate-x-[10%] -translate-y-1/2 opacity-45 [--light-color:var(--hero-light-support)] dark:opacity-30"
        />
      </div>
    </div>

    <div
      class="mx-auto flex w-full max-w-[86rem] flex-col items-center px-5 py-16 text-center sm:px-8 sm:py-24"
    >
      <slot />
    </div>
  </div>
</template>
