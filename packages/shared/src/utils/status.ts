export const STATUS_COLORS: Record<string, string> = {
  pending: '#9CA3AF',
  released: '#007AFF',
  in_progress: '#FCD34D',
  paused_for_trades: '#FF9500',
  backframe: '#A78BFA',
  inspection: '#AF52DE',
  completed: '#10B981',
  // Legacy (backward compat)
  not_started: '#9CA3AF',
  delayed: '#EF4444',
  on_hold: '#A78BFA',
}

export const LIGHT_STATUS_COLORS: Record<string, string> = {
  pending: '#8E8E93',
  released: '#007AFF',
  in_progress: '#007AFF',
  paused_for_trades: '#FF9500',
  backframe: '#5856D6',
  inspection: '#AF52DE',
  completed: '#34C759',
  // Legacy
  not_started: '#8E8E93',
  delayed: '#FF3B30',
  on_hold: '#FF9500',
}

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  released: 'Released',
  in_progress: 'In Progress',
  paused_for_trades: 'Paused for Trades',
  backframe: 'Backframe',
  inspection: 'Inspection',
  completed: 'Completed',
  // Legacy
  not_started: 'Not Started',
  delayed: 'Delayed',
  on_hold: 'On Hold',
}

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || STATUS_COLORS.pending
}

export function getLightStatusColor(status: string): string {
  return LIGHT_STATUS_COLORS[status] || LIGHT_STATUS_COLORS.pending
}

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || 'Unknown'
}
