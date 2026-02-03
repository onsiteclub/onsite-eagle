/**
 * Event Configuration for Timeline Events
 * Used across Eagle apps for consistent event display
 */

import type { EventType as DBEventType, HouseStatus as DBHouseStatus, IssueSeverity as DBIssueSeverity } from '../types/database'

export const EVENT_CONFIG = {
  photo: {
    icon: 'Camera',
    color: '#007AFF',
    label: 'Photo',
    labelPt: 'Foto',
  },
  issue: {
    icon: 'AlertTriangle',
    color: '#FF3B30',
    label: 'Issue',
    labelPt: 'Problema',
  },
  inspection: {
    icon: 'ClipboardCheck',
    color: '#AF52DE',
    label: 'Inspection',
    labelPt: 'Inspeção',
  },
  ai_validation: {
    icon: 'Sparkles',
    color: '#34C759',
    label: 'AI Validation',
    labelPt: 'Validação IA',
  },
  status_change: {
    icon: 'RefreshCw',
    color: '#FF9500',
    label: 'Status Change',
    labelPt: 'Mudança de Status',
  },
  note: {
    icon: 'MessageSquare',
    color: '#8E8E93',
    label: 'Note',
    labelPt: 'Nota',
  },
  email: {
    icon: 'Mail',
    color: '#007AFF',
    label: 'Email',
    labelPt: 'Email',
  },
  calendar: {
    icon: 'Calendar',
    color: '#5856D6',
    label: 'Calendar',
    labelPt: 'Calendário',
  },
  alert: {
    icon: 'Bell',
    color: '#FF9500',
    label: 'Alert',
    labelPt: 'Alerta',
  },
  assignment: {
    icon: 'UserPlus',
    color: '#007AFF',
    label: 'Assignment',
    labelPt: 'Atribuição',
  },
  milestone: {
    icon: 'Flag',
    color: '#5856D6',
    label: 'Milestone',
    labelPt: 'Marco',
  },
  document: {
    icon: 'FileText',
    color: '#6E6E73',
    label: 'Document',
    labelPt: 'Documento',
  },
} as const

// Use types from database.ts to avoid conflicts
export type EventConfigKey = keyof typeof EVENT_CONFIG
export type EventConfig = typeof EVENT_CONFIG[EventConfigKey]

/**
 * House/Lot Status Configuration
 * Colors follow App Store Connect design language
 */
export const STATUS_CONFIG = {
  not_started: {
    color: '#8E8E93',
    label: 'Not Started',
    labelPt: 'Não Iniciado',
  },
  in_progress: {
    color: '#007AFF',
    label: 'In Progress',
    labelPt: 'Em Andamento',
  },
  delayed: {
    color: '#FF3B30',
    label: 'Delayed',
    labelPt: 'Atrasado',
  },
  completed: {
    color: '#34C759',
    label: 'Completed',
    labelPt: 'Concluído',
  },
  on_hold: {
    color: '#FF9500',
    label: 'On Hold',
    labelPt: 'Em Espera',
  },
} as const

// Use types from database.ts to avoid conflicts
export type StatusConfigKey = keyof typeof STATUS_CONFIG
export type StatusConfig = typeof STATUS_CONFIG[StatusConfigKey]

/**
 * Issue Severity Configuration
 */
export const SEVERITY_CONFIG = {
  low: {
    color: '#8E8E93',
    label: 'Low',
    labelPt: 'Baixa',
  },
  medium: {
    color: '#FF9500',
    label: 'Medium',
    labelPt: 'Média',
  },
  high: {
    color: '#FF3B30',
    label: 'High',
    labelPt: 'Alta',
  },
  critical: {
    color: '#AF52DE',
    label: 'Critical',
    labelPt: 'Crítico',
  },
} as const

// Use types from database.ts to avoid conflicts
export type SeverityConfigKey = keyof typeof SEVERITY_CONFIG
export type SeverityConfig = typeof SEVERITY_CONFIG[SeverityConfigKey]

/**
 * Helper to get event config by type
 */
export function getEventConfig(type: DBEventType) {
  return EVENT_CONFIG[type]
}

/**
 * Helper to get status config by status
 */
export function getStatusConfig(status: DBHouseStatus) {
  return STATUS_CONFIG[status]
}

/**
 * Helper to get severity config by severity level
 */
export function getSeverityConfig(severity: DBIssueSeverity) {
  return SEVERITY_CONFIG[severity]
}
