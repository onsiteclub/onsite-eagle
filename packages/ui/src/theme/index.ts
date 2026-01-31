export * from './colors'
export * from './typography'
export * from './spacing'
export * from './icons'

import { colors } from './colors'
import { typography, textStyles } from './typography'
import { spacing, borderRadius, shadows } from './spacing'
import { lotIcons, lotIconLabels } from './icons'

// Complete theme object
export const theme = {
  colors,
  typography,
  textStyles,
  spacing,
  borderRadius,
  shadows,
  lotIcons,
  lotIconLabels,
} as const

export type Theme = typeof theme
