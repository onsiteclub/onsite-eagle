import type { HouseStatus } from '../types/database'

export const STATUS_COLORS: Record<HouseStatus, string> = {
  not_started: '#9CA3AF', // gray
  in_progress: '#FCD34D', // yellow
  delayed: '#EF4444',     // red
  completed: '#10B981',   // green
}

export const STATUS_LABELS: Record<HouseStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  delayed: 'Delayed',
  completed: 'Completed',
}

export function getStatusColor(status: HouseStatus): string {
  return STATUS_COLORS[status] || STATUS_COLORS.not_started
}

export function getStatusLabel(status: HouseStatus): string {
  return STATUS_LABELS[status] || 'Unknown'
}
