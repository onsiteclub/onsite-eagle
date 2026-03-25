import type { LotStatus } from '../types/lot'
import type { ItemSeverity } from '../types/house-item'
import type { WarningCategory } from '../types/warning'
import type { PaymentStatus, HoldbackStatus } from '../types/payment'
import type { EquipmentRequestStatus, EquipmentPriority } from '../types/material'

// ==========================================
// Lot Status
// ==========================================
export const LOT_STATUS_CONFIG: Record<LotStatus, { color: string; label: string; labelPt: string }> = {
  pending: { color: '#8E8E93', label: 'Pending', labelPt: 'Pendente' },
  released: { color: '#007AFF', label: 'Released', labelPt: 'Liberado' },
  in_progress: { color: '#34C759', label: 'In Progress', labelPt: 'Em Andamento' },
  paused_for_trades: { color: '#FF9500', label: 'Paused for Trades', labelPt: 'Pausa p/ Trades' },
  backframe: { color: '#5856D6', label: 'Backframe', labelPt: 'Backframe' },
  inspection: { color: '#AF52DE', label: 'Inspection', labelPt: 'Inspeção' },
  completed: { color: '#30D158', label: 'Completed', labelPt: 'Concluído' },
}

// ==========================================
// Item Severity
// ==========================================
export const SEVERITY_CONFIG: Record<ItemSeverity, { color: string; label: string; labelPt: string }> = {
  low: { color: '#8E8E93', label: 'Low', labelPt: 'Baixa' },
  medium: { color: '#FF9500', label: 'Medium', labelPt: 'Média' },
  high: { color: '#FF3B30', label: 'High', labelPt: 'Alta' },
  critical: { color: '#AF52DE', label: 'Critical', labelPt: 'Crítico' },
}

// ==========================================
// Warning Category
// ==========================================
export const WARNING_CATEGORY_CONFIG: Record<WarningCategory, { color: string; emoji: string; label: string; dismissable: boolean }> = {
  safety: { color: '#FF3B30', emoji: '🔴', label: 'Safety', dismissable: false },
  compliance: { color: '#FFCC00', emoji: '🟡', label: 'Compliance', dismissable: false },
  operational: { color: '#007AFF', emoji: '🔵', label: 'Operational', dismissable: true },
}

// ==========================================
// Urgency
// ==========================================
export const URGENCY_COLORS: Record<string, string> = {
  critical: '#FF3B30',
  high: '#FF9500',
  medium: '#FFCC00',
  low: '#8E8E93',
}

export const URGENCY_LABELS: Record<string, string> = {
  critical: 'Critical - Blocking work NOW',
  high: 'High - Needed within hours',
  medium: 'Medium - Needed today',
  low: 'Low - Can wait 24+ hours',
}

// ==========================================
// Payment Status
// ==========================================
export const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { color: string; label: string; labelPt: string }> = {
  unpaid: { color: '#8E8E93', label: 'Unpaid', labelPt: 'Não pago' },
  pending: { color: '#FF9500', label: 'Pending', labelPt: 'Pendente' },
  approved: { color: '#007AFF', label: 'Approved', labelPt: 'Aprovado' },
  paid: { color: '#30D158', label: 'Paid', labelPt: 'Pago' },
}

// ==========================================
// Holdback Status
// ==========================================
export const HOLDBACK_STATUS_CONFIG: Record<HoldbackStatus, { color: string; label: string; labelPt: string }> = {
  none: { color: '#8E8E93', label: 'No Holdback', labelPt: 'Sem Retenção' },
  held: { color: '#FF9500', label: 'Held', labelPt: 'Retido' },
  released: { color: '#30D158', label: 'Released', labelPt: 'Liberado' },
  reassigned: { color: '#5856D6', label: 'Reassigned', labelPt: 'Reatribuído' },
}

// ==========================================
// Equipment Status
// ==========================================
export const EQUIPMENT_STATUS_CONFIG: Record<EquipmentRequestStatus, { color: string; label: string }> = {
  requested: { color: '#FF9500', label: 'Requested' },
  accepted: { color: '#007AFF', label: 'Accepted' },
  scheduled: { color: '#5856D6', label: 'Scheduled' },
  in_progress: { color: '#34C759', label: 'In Progress' },
  completed: { color: '#30D158', label: 'Completed' },
  cancelled: { color: '#8E8E93', label: 'Cancelled' },
}

export const EQUIPMENT_PRIORITY_CONFIG: Record<EquipmentPriority, { color: string; label: string }> = {
  low: { color: '#8E8E93', label: 'Low' },
  normal: { color: '#007AFF', label: 'Normal' },
  high: { color: '#FF9500', label: 'High' },
  urgent: { color: '#FF3B30', label: 'Urgent' },
}
