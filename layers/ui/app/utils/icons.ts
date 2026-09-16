import { config, type IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  faBox,
  faChartSimple,
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faImage,
  faMoon,
  faSun,
} from '@fortawesome/free-solid-svg-icons'

/**
 * The icons this product uses, by the name a template writes.
 *
 * Named here and passed as definitions rather than registered in Font Awesome's
 * runtime library, so an icon the list does not carry is a type error instead of
 * an element that renders nothing.
 */
export const ICONS = {
  'chart-simple': faChartSimple,
  box: faBox,
  moon: faMoon,
  sun: faSun,
  'chevron-down': faChevronDown,
  'chevron-left': faChevronLeft,
  'chevron-right': faChevronRight,
  image: faImage,
} as const satisfies Record<string, IconDefinition>

export type IconName = keyof typeof ICONS

/**
 * The library's stylesheet sizes every icon at `1em` and is not imported, so an
 * icon is an ordinary SVG that the sizing utilities control like anything else.
 * Nothing here uses the layout helpers that sheet also carries.
 */
config.autoAddCss = false
