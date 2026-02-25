/**
 * @onsite/agenda — Constants for Agenda rendering.
 */

import type { AgendaEventType, ImpactSeverity } from './types';

// ─── Event Type Display Config ──────────────────────────────

export const AGENDA_EVENT_CONFIG: Record<AgendaEventType, { color: string; icon: string; label: string; category: string }> = {
  // Weather
  weather_snow: { color: '#5AC8FA', icon: 'snow', label: 'Snow', category: 'weather' },
  weather_rain: { color: '#007AFF', icon: 'rainy', label: 'Rain', category: 'weather' },
  weather_cold: { color: '#5856D6', icon: 'thermometer', label: 'Cold', category: 'weather' },
  weather_heat: { color: '#FF3B30', icon: 'sunny', label: 'Heat', category: 'weather' },
  weather_wind: { color: '#8E8E93', icon: 'flag', label: 'Wind', category: 'weather' },
  // Administrative
  holiday: { color: '#FF9500', icon: 'calendar', label: 'Holiday', category: 'admin' },
  permit_delay: { color: '#FF3B30', icon: 'document-lock', label: 'Permit Delay', category: 'admin' },
  permit_approved: { color: '#34C759', icon: 'document', label: 'Permit OK', category: 'admin' },
  // Inspection
  inspection_scheduled: { color: '#AF52DE', icon: 'clipboard', label: 'Inspection', category: 'inspection' },
  inspection_passed: { color: '#34C759', icon: 'checkmark-circle', label: 'Passed', category: 'inspection' },
  inspection_failed: { color: '#FF3B30', icon: 'close-circle', label: 'Failed', category: 'inspection' },
  inspection_cancelled: { color: '#8E8E93', icon: 'close', label: 'Cancelled', category: 'inspection' },
  // Material
  material_delivery: { color: '#34C759', icon: 'cube', label: 'Delivery', category: 'material' },
  material_shortage: { color: '#FF3B30', icon: 'alert-circle', label: 'Shortage', category: 'material' },
  material_order: { color: '#007AFF', icon: 'cart', label: 'Order', category: 'material' },
  // Worker
  worker_assigned: { color: '#007AFF', icon: 'person-add', label: 'Assigned', category: 'worker' },
  worker_absent: { color: '#FF9500', icon: 'person-remove', label: 'Absent', category: 'worker' },
  worker_vacation: { color: '#5AC8FA', icon: 'airplane', label: 'Vacation', category: 'worker' },
  // Phase deadlines
  phase_start: { color: '#007AFF', icon: 'play', label: 'Phase Start', category: 'phase' },
  phase_deadline: { color: '#FF9500', icon: 'time', label: 'Deadline', category: 'phase' },
  phase_completed: { color: '#34C759', icon: 'checkmark', label: 'Completed', category: 'phase' },
  // General
  meeting: { color: '#5856D6', icon: 'people', label: 'Meeting', category: 'general' },
  task: { color: '#007AFF', icon: 'list', label: 'Task', category: 'general' },
  reminder: { color: '#FF9500', icon: 'notifications', label: 'Reminder', category: 'general' },
  other: { color: '#8E8E93', icon: 'ellipsis-horizontal', label: 'Other', category: 'general' },
};

// ─── Impact Severity Colors ─────────────────────────────────

export const IMPACT_COLORS: Record<ImpactSeverity, { color: string; label: string }> = {
  none: { color: '#8E8E93', label: 'None' },
  minor: { color: '#FF9500', label: 'Minor' },
  medium: { color: '#FF9500', label: 'Medium' },
  major: { color: '#FF3B30', label: 'Major' },
  critical: { color: '#AF52DE', label: 'Critical' },
};

// ─── Event Categories ───────────────────────────────────────

export const EVENT_CATEGORIES = [
  { key: 'all', label: 'All', color: '#007AFF' },
  { key: 'weather', label: 'Weather', color: '#5AC8FA' },
  { key: 'inspection', label: 'Inspection', color: '#AF52DE' },
  { key: 'material', label: 'Material', color: '#34C759' },
  { key: 'worker', label: 'Worker', color: '#FF9500' },
  { key: 'phase', label: 'Phase', color: '#007AFF' },
  { key: 'admin', label: 'Admin', color: '#8E8E93' },
  { key: 'general', label: 'General', color: '#6E6E73' },
] as const;
