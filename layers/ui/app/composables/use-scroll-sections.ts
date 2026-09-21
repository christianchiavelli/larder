import {
  useIntersectionObserver,
  useMutationObserver,
  usePreferredReducedMotion,
} from '@vueuse/core'
import { computed, onMounted, ref, shallowRef, type Ref } from 'vue'

export const SCROLL_SECTION_ATTRIBUTE = 'data-scroll-section'

const SECTION_SELECTOR = `[${SCROLL_SECTION_ATTRIBUTE}]`

export interface SectionOffset {
  top: number
  scrollMarginTop: number
}

export function nextSectionIndex(offsets: readonly SectionOffset[]): number | null {
  const index = offsets.findIndex(({ top, scrollMarginTop }) => top - scrollMarginTop > 1)
  return index === -1 ? null : index
}

export function useScrollSections(sentinel: Ref<HTMLElement | null>) {
  const root = shallowRef<HTMLElement | null>(null)
  const hasSections = ref(false)
  const reachedEnd = ref(false)
  const motion = usePreferredReducedMotion()

  function findSections(): HTMLElement[] {
    return [...(root.value ?? document).querySelectorAll<HTMLElement>(SECTION_SELECTOR)]
  }

  onMounted(() => {
    root.value = sentinel.value?.closest('main') ?? null
    hasSections.value = findSections().length > 0
  })

  useMutationObserver(
    root,
    () => {
      hasSections.value = findSections().length > 0
    },
    { childList: true, subtree: true },
  )

  useIntersectionObserver(sentinel, ([entry]) => {
    if (entry) reachedEnd.value = entry.isIntersecting
  })

  function goToNext(): void {
    const sections = findSections()
    const index = nextSectionIndex(
      sections.map((section) => ({
        top: section.getBoundingClientRect().top,
        scrollMarginTop: parseFloat(getComputedStyle(section).scrollMarginTop) || 0,
      })),
    )

    sections[index ?? -1]?.scrollIntoView({
      behavior: motion.value === 'reduce' ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  return {
    hasNext: computed(() => hasSections.value && !reachedEnd.value),
    goToNext,
  }
}
