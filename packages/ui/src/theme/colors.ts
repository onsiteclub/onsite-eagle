/**
 * OnSite Eagle Color Palette
 * Shared across web and mobile apps
 */

export const colors = {
  // Brand Colors
  brand: {
    primary: '#059669',     // Emerald - main brand color
    secondary: '#1F2937',   // Dark gray - secondary
    accent: '#3B82F6',      // Blue - links, actions
  },

  // Background Colors
  background: {
    primary: '#111827',     // Main dark background
    secondary: '#1F2937',   // Cards, elevated surfaces
    tertiary: '#374151',    // Inputs, borders
  },

  // Text Colors
  text: {
    primary: '#FFFFFF',
    secondary: '#D1D5DB',
    muted: '#9CA3AF',
    disabled: '#6B7280',
  },

  // Status Colors (for houses/lots)
  status: {
    notStarted: '#6B7280',  // Gray
    inProgress: '#F59E0B',  // Amber/Yellow
    delayed: '#EF4444',     // Red
    completed: '#10B981',   // Green
    onHold: '#8B5CF6',      // Purple
  },

  // Role Colors
  role: {
    worker: '#10B981',      // Green
    foreman: '#3B82F6',     // Blue
    manager: '#8B5CF6',     // Purple
    admin: '#EC4899',       // Pink
  },

  // Feedback Colors
  feedback: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },

  // Lot Icons Background
  lotIcon: {
    worker: 'rgba(16, 185, 129, 0.2)',     // Green tint
    foreman: 'rgba(59, 130, 246, 0.2)',    // Blue tint
    photo: 'rgba(251, 191, 36, 0.2)',      // Yellow tint
    issue: 'rgba(239, 68, 68, 0.2)',       // Red tint
    completed: 'rgba(16, 185, 129, 0.3)',  // Green stronger
  },

  // Common
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const

export type ColorKey = keyof typeof colors
export type StatusColor = keyof typeof colors.status
export type RoleColor = keyof typeof colors.role
