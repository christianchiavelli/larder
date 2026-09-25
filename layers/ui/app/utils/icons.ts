import { config, type IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  faArrowDown,
  faBox,
  faChartSimple,
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faDownload,
  faImage,
  faMagnifyingGlass,
  faMoon,
  faSun,
} from '@fortawesome/free-solid-svg-icons'

export const ICONS = {
  'arrow-down': faArrowDown,
  'chart-simple': faChartSimple,
  box: faBox,
  moon: faMoon,
  sun: faSun,
  'chevron-down': faChevronDown,
  'chevron-left': faChevronLeft,
  'chevron-right': faChevronRight,
  download: faDownload,
  image: faImage,
  search: faMagnifyingGlass,
} as const satisfies Record<string, IconDefinition>

export type IconName = keyof typeof ICONS

config.autoAddCss = false
