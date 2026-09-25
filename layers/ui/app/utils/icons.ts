import { config, type IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  faArrowDown,
  faArrowRotateRight,
  faArrowUpRightFromSquare,
  faBox,
  faChartSimple,
  faCheck,
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faCircleCheck,
  faCircleInfo,
  faDownload,
  faImage,
  faMagnifyingGlass,
  faMoon,
  faSun,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'

export const ICONS = {
  'arrow-down': faArrowDown,
  'arrow-rotate-right': faArrowRotateRight,
  'arrow-up-right-from-square': faArrowUpRightFromSquare,
  'chart-simple': faChartSimple,
  box: faBox,
  check: faCheck,
  'circle-check': faCircleCheck,
  'circle-info': faCircleInfo,
  moon: faMoon,
  sun: faSun,
  'chevron-down': faChevronDown,
  'chevron-left': faChevronLeft,
  'chevron-right': faChevronRight,
  download: faDownload,
  image: faImage,
  search: faMagnifyingGlass,
  xmark: faXmark,
} as const satisfies Record<string, IconDefinition>

export type IconName = keyof typeof ICONS

config.autoAddCss = false
