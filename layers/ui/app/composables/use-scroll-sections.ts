import {
  useIntersectionObserver,
  useMutationObserver,
  usePreferredReducedMotion,
} from '@vueuse/core'
import { computed, onMounted, ref, shallowRef, type Ref } from 'vue'

/** Marks an element as somewhere the page can step to. */
export const SCROLL_SECTION_ATTRIBUTE = 'data-scroll-section'

const SECTION_SELECTOR = `[${SCROLL_SECTION_ATTRIBUTE}]`

/** A section's distance from the viewport top, and the gap it asks to keep. */
export interface SectionOffset {
  top: number
  scrollMarginTop: number
}

/**
 * Index of the first section still below the fold, or null at the end.
 *
 * A section that has been scrolled to sits at its own `scroll-margin-top`
 * rather than at zero, so the comparison subtracts that instead of allowing a
 * fixed tolerance: the page decides the offset and this reads it back.
 */
export function nextSectionIndex(offsets: readonly SectionOffset[]): number | null {
  const index = offsets.findIndex(({ top, scrollMarginTop }) => top - scrollMarginTop > 1)
  return index === -1 ? null : index
}

/**
 * Stepping through a page section by section.
 *
 * The end of the content is detected with a sentinel placed after it rather
 * than by measuring the sections: an observer on a zero-height element fires
 * exactly once, at the right pixel, where thresholds on a tall section fire in
 * coarse steps and a scroll listener fires on every frame.
 *
 * Positions are read on click, which is the only moment they are needed, so
 * scrolling costs no layout.
 */
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

  // Sections arrive with the data on pages that render them behind a `v-if`.
  // Only the count is read here, so a mutation costs a query and no layout.
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
