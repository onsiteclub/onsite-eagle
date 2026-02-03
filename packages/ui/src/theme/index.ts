export * from './colors'
export * from './typography'
export * from './spacing'
export * from './icons'

import { colors, lightTheme, darkTheme } from './colors'
import { typography, textStyles } from './typography'
import { spacing, borderRadius, shadows } from './spacing'
import { lotIcons, lotIconLabels } from './icons'

// Complete theme object (default - dark theme for backward compatibility)
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

// Dashboard theme (light - App Store Connect style)
export const dashboardTheme = {
  colors: lightTheme,
  typography,
  textStyles,
  spacing,
  borderRadius,
  shadows,
  lotIcons,
  lotIconLabels,
} as const

// Field theme (dark - original)
export const fieldTheme = {
  colors: darkTheme,
  typography,
  textStyles,
  spacing,
  borderRadius,
  shadows,
  lotIcons,
  lotIconLabels,
} as const

export type Theme = typeof theme
export type DashboardTheme = typeof dashboardTheme
export type FieldTheme = typeof fieldTheme
