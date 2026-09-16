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
 * Passed as definitions rather than registered in Font Awesome's runtime
 * library, so a name the map does not carry is a type error.
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
 * The library stylesheet sizes every icon at `1em` and is not imported, so an
 * icon is an ordinary SVG the sizing utilities control.
 */
config.autoAddCss = false
