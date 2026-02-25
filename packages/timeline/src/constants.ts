/**
 * @onsite/timeline — Shared constants for Timeline rendering.
 *
 * Colors, labels, and config used by both web and native components.
 */

import type { SenderType, SenderConfig, TimelineEventType } from './types';

// ─── Phase Colors (construction phases) ─────────────────────

export const PHASE_COLORS: Record<number, { bg: string; name: string; border: string }> = {
  1: { bg: '#FFF8E7', name: 'First Floor', border: '#FFE0B2' },
  2: { bg: '#FFFDE7', name: '1st Floor Walls', border: '#FFF59D' },
  3: { bg: '#F1F8E9', name: 'Second Floor', border: '#C5E1A5' },
  4: { bg: '#E3F2FD', name: '2nd Floor Walls', border: '#90CAF9' },
  5: { bg: '#EDE7F6', name: 'Roof', border: '#B39DDB' },
  6: { bg: '#FBE9E7', name: 'Stairs Landing', border: '#FFAB91' },
  7: { bg: '#ECEFF1', name: 'Backing Frame', border: '#B0BEC5' },
};

// ─── Sender Config ──────────────────────────────────────────

export const SENDER_CONFIG: Record<SenderType, SenderConfig> = {
  worker: {
    color: '#FF9500',
    bgColor: '#FF9500',
    label: 'Worker',
    icon: 'hard-hat',
  },
  supervisor: {
    color: '#007AFF',
    bgColor: '#007AFF',
    label: 'Supervisor',
    icon: 'person',
  },
  operator: {
    color: '#5856D6',
    bgColor: '#5856D6',
    label: 'Operator',
    icon: 'construct',
  },
  ai: {
    color: '#AF52DE',
    bgColor: '#AF52DE',
    label: 'AI',
    icon: 'sparkles',
  },
  system: {
    color: '#8E8E93',
    bgColor: '#8E8E93',
    label: 'System',
    icon: 'settings',
  },
};

// ─── Event Type Config ──────────────────────────────────────

export const EVENT_TYPE_CONFIG: Record<TimelineEventType, { color: string; icon: string; label: string }> = {
  photo: { color: '#007AFF', icon: 'camera', label: 'Photo' },
  email: { color: '#007AFF', icon: 'mail', label: 'Email' },
  calendar: { color: '#5856D6', icon: 'calendar', label: 'Calendar' },
  note: { color: '#8E8E93', icon: 'chatbubble', label: 'Note' },
  alert: { color: '#FF9500', icon: 'alert-circle', label: 'Alert' },
  ai_validation: { color: '#34C759', icon: 'checkmark-circle', label: 'AI Validation' },
  status_change: { color: '#FF9500', icon: 'refresh', label: 'Status Change' },
  issue: { color: '#FF3B30', icon: 'warning', label: 'Issue' },
  inspection: { color: '#AF52DE', icon: 'clipboard', label: 'Inspection' },
  assignment: { color: '#007AFF', icon: 'person-add', label: 'Assignment' },
  milestone: { color: '#5856D6', icon: 'flag', label: 'Milestone' },
  document: { color: '#6E6E73', icon: 'document-text', label: 'Document' },
  material_request: { color: '#FF9500', icon: 'cube', label: 'Material Request' },
  material_delivery: { color: '#34C759', icon: 'checkmark-done', label: 'Delivered' },
  material_issue: { color: '#FF3B30', icon: 'alert-circle', label: 'Material Issue' },
  worker_arrival: { color: '#34C759', icon: 'log-in', label: 'Arrived' },
  worker_departure: { color: '#8E8E93', icon: 'log-out', label: 'Left' },
};
