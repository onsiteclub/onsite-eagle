import type { HouseStatus } from '../types/database'

// Legacy colors (dark theme)
export const STATUS_COLORS: Record<HouseStatus, string> = {
  not_started: '#9CA3AF',
  in_progress: '#FCD34D',
  delayed: '#EF4444',
  completed: '#10B981',
  on_hold: '#A78BFA',
}

// Light theme colors (App Store Connect style)
export const LIGHT_STATUS_COLORS: Record<HouseStatus, string> = {
  not_started: '#8E8E93',
  in_progress: '#007AFF',
  delayed: '#FF3B30',
  completed: '#34C759',
  on_hold: '#FF9500',
}

export const STATUS_LABELS: Record<HouseStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  delayed: 'Delayed',
  completed: 'Completed',
  on_hold: 'On Hold',
}

export function getStatusColor(status: HouseStatus): string {
  return STATUS_COLORS[status] || STATUS_COLORS.not_started
}

export function getLightStatusColor(status: HouseStatus): string {
  return LIGHT_STATUS_COLORS[status] || LIGHT_STATUS_COLORS.not_started
}

export function getStatusLabel(status: HouseStatus): string {
  return STATUS_LABELS[status] || 'Unknown'
}
