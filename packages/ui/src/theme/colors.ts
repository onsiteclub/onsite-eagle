/**
 * OnSite Eagle Color Palette
 * Shared across web and mobile apps
 *
 * Light theme inspired by App Store Connect
 * Dark theme for field/mobile apps
 */

// ============================================
// LIGHT THEME (App Store Connect style)
// For dashboard apps: Monitor, Analytics, etc.
// ============================================
export const lightTheme = {
  // Brand Colors
  brand: {
    primary: '#007AFF',     // Apple Blue - main brand color
    secondary: '#5856D6',   // Purple - secondary
    accent: '#007AFF',      // Blue - links, actions
  },

  // Background Colors
  background: {
    primary: '#FFFFFF',     // Main white background
    secondary: '#F5F5F7',   // Light gray - cards, sections
    tertiary: '#E5E5EA',    // Borders, dividers
    elevated: '#FFFFFF',    // Elevated cards (with shadow)
  },

  // Text Colors
  text: {
    primary: '#1D1D1F',     // Almost black
    secondary: '#6E6E73',   // Medium gray
    muted: '#86868B',       // Light gray
    disabled: '#AEAEB2',    // Very light gray
    inverse: '#FFFFFF',     // White text on dark bg
  },

  // Border Colors
  border: {
    primary: '#D2D2D7',     // Default border
    secondary: '#E5E5EA',   // Light border
    focus: '#007AFF',       // Focus state
  },

  // Status Colors (for houses/lots)
  status: {
    notStarted: '#8E8E93',  // Gray
    inProgress: '#FF9500',  // Orange
    delayed: '#FF3B30',     // Red
    completed: '#34C759',   // Green
    onHold: '#AF52DE',      // Purple
  },

  // Role Colors
  role: {
    worker: '#34C759',      // Green
    foreman: '#007AFF',     // Blue
    manager: '#AF52DE',     // Purple
    admin: '#FF2D55',       // Pink
  },

  // Feedback Colors
  feedback: {
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#007AFF',
  },

  // Stat Card Backgrounds (subtle tints)
  statCard: {
    blue: 'rgba(0, 122, 255, 0.08)',
    green: 'rgba(52, 199, 89, 0.08)',
    orange: 'rgba(255, 149, 0, 0.08)',
    red: 'rgba(255, 59, 48, 0.08)',
    purple: 'rgba(175, 82, 222, 0.08)',
  },

  // Sidebar
  sidebar: {
    background: '#F5F5F7',
    hover: '#E5E5EA',
    active: '#007AFF',
    activeBackground: 'rgba(0, 122, 255, 0.12)',
    text: '#1D1D1F',
    textMuted: '#6E6E73',
  },
} as const

// ============================================
// DARK THEME (Original)
// For field/mobile apps: Field, Inspect, etc.
// ============================================
export const darkTheme = {
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
    elevated: '#1F2937',    // Elevated cards
  },

  // Text Colors
  text: {
    primary: '#FFFFFF',
    secondary: '#D1D5DB',
    muted: '#9CA3AF',
    disabled: '#6B7280',
    inverse: '#111827',
  },

  // Border Colors
  border: {
    primary: '#374151',
    secondary: '#4B5563',
    focus: '#059669',
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

  // Stat Card Backgrounds (dark tints)
  statCard: {
    blue: 'rgba(59, 130, 246, 0.2)',
    green: 'rgba(16, 185, 129, 0.2)',
    orange: 'rgba(245, 158, 11, 0.2)',
    red: 'rgba(239, 68, 68, 0.2)',
    purple: 'rgba(139, 92, 246, 0.2)',
  },

  // Sidebar
  sidebar: {
    background: '#1F2937',
    hover: '#374151',
    active: '#059669',
    activeBackground: 'rgba(5, 150, 105, 0.2)',
    text: '#FFFFFF',
    textMuted: '#9CA3AF',
  },
} as const

// ============================================
// DEFAULT EXPORT (backward compatible)
// ============================================
export const colors = {
  ...darkTheme,

  // Lot Icons Background (legacy)
  lotIcon: {
    worker: 'rgba(16, 185, 129, 0.2)',
    foreman: 'rgba(59, 130, 246, 0.2)',
    photo: 'rgba(251, 191, 36, 0.2)',
    issue: 'rgba(239, 68, 68, 0.2)',
    completed: 'rgba(16, 185, 129, 0.3)',
  },

  // Common
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const

// Theme type
export type ThemeColors = typeof lightTheme | typeof darkTheme
export type ColorKey = keyof typeof colors
export type StatusColor = keyof typeof colors.status
export type RoleColor = keyof typeof colors.role
