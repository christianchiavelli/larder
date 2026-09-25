<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()

const open = defineModel<boolean>('open', { required: true })

const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const titleId = useId()
const descriptionId = useId()
const rendered = ref(false)

let returnFocusTo: HTMLElement | null = null
let releaseScroll: (() => void) | null = null
let pressedOnBackdrop = false

function lockScroll(): () => void {
  const root = document.documentElement
  const scrollbarWidth = window.innerWidth - root.clientWidth
  const { overflow, paddingInlineEnd } = root.style

  root.style.overflow = 'hidden'
  if (scrollbarWidth > 0) root.style.paddingInlineEnd = `${scrollbarWidth}px`

  return () => {
    root.style.overflow = overflow
    root.style.paddingInlineEnd = paddingInlineEnd
  }
}

async function show() {
  rendered.value = true
  await nextTick()

  const element = dialog.value
  if (!element || element.open) return

  returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
  releaseScroll = lockScroll()
  element.showModal()
}

watch(open, (isOpen) => {
  if (isOpen) void show()
  else dialog.value?.close()
})

onMounted(() => {
  if (open.value) void show()
})

onBeforeUnmount(() => {
  releaseScroll?.()
})

function onClose() {
  open.value = false

  releaseScroll?.()
  releaseScroll = null

  const target = returnFocusTo
  returnFocusTo = null

  const focusIsLost =
    document.activeElement === document.body || dialog.value?.contains(document.activeElement)
  if (target?.isConnected && focusIsLost) target.focus()
}

function onPointerDown(event: PointerEvent) {
  pressedOnBackdrop = event.target === dialog.value
}

function onClick(event: MouseEvent) {
  if (pressedOnBackdrop && event.target === dialog.value) open.value = false
  pressedOnBackdrop = false
}
</script>

<template>
  <dialog
    ref="dialog"
    :aria-labelledby="titleId"
    :aria-describedby="description ? descriptionId : undefined"
    class="mx-auto mt-[max(2rem,8vh)] mb-auto max-h-[calc(100dvh-max(2rem,8vh)-2rem)] w-[40rem] max-w-[calc(100vw-2rem)] translate-y-2 overflow-hidden rounded-shell border-0 bg-surface-raised p-0 text-ink opacity-0 shadow-overlay transition-[opacity,translate,display,overlay] transition-discrete duration-(--duration-enter) backdrop:bg-chrome/55 backdrop:opacity-0 backdrop:transition-[opacity,display,overlay] backdrop:transition-discrete backdrop:duration-(--duration-enter) open:translate-y-0 open:opacity-100 open:backdrop:opacity-100 starting:open:translate-y-2 starting:open:opacity-0 starting:open:backdrop:opacity-0 max-sm:mt-auto max-sm:mb-0 max-sm:max-h-[calc(100dvh-2.75rem)] max-sm:w-full max-sm:max-w-full max-sm:rounded-b-none"
    @close="onClose"
    @pointerdown="onPointerDown"
    @click="onClick"
  >
    <div v-if="rendered" class="flex max-h-[inherit] flex-col">
      <header class="flex items-start gap-4 px-6 pt-6 pb-5 max-sm:px-5 max-sm:pt-5 max-sm:pb-4">
        <div class="min-w-0 flex-1">
          <h2
            :id="titleId"
            tabindex="-1"
            autofocus
            class="text-heading text-ink focus:outline-none"
          >
            {{ title }}
          </h2>
          <p v-if="description" :id="descriptionId" class="mt-1 text-body text-ink-muted">
            {{ description }}
          </p>
        </div>

        <button
          type="button"
          class="-mt-1 -mr-2 inline-flex size-8 shrink-0 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
          aria-label="Close"
          @click="open = false"
        >
          <UiIcon name="xmark" class="size-4" />
        </button>
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto px-6 pb-6 max-sm:px-5 max-sm:pb-5">
        <slot />
      </div>

      <footer
        v-if="$slots.footer"
        class="border-t border-edge-subtle bg-surface px-6 py-4 max-sm:px-5 max-sm:pb-5"
      >
        <slot name="footer" />
      </footer>
    </div>
  </dialog>
</template>
