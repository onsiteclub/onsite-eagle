/**
 * OnSite Eagle Icon Definitions
 * Icons that appear on lot cards/map
 */

// Lot Status Icons (emoji for now, can be replaced with SVG)
export const lotIcons = {
  // Worker related
  workerAssigned: '👷',
  workerActive: '🔨',

  // Progress related
  notStarted: '⚪',
  inProgress: '🟡',
  completed: '✅',
  delayed: '🔴',
  onHold: '⏸️',

  // Activity related
  photoTaken: '📷',
  documentAdded: '📄',
  noteAdded: '📝',
  issueReported: '⚠️',
  inspectionDue: '🔍',
  inspectionPassed: '✓',

  // Timeline related
  planReceived: '📋',
  startDate: '🚀',
  deadline: '🎯',

  // Roles
  foreman: '👔',
  worker: '👷',
  manager: '💼',
} as const

// Icon labels in Portuguese
export const lotIconLabels: Record<keyof typeof lotIcons, string> = {
  workerAssigned: 'Trabalhador Atribuído',
  workerActive: 'Trabalhador Ativo',
  notStarted: 'Não Iniciado',
  inProgress: 'Em Andamento',
  completed: 'Concluído',
  delayed: 'Atrasado',
  onHold: 'Em Espera',
  photoTaken: 'Foto Tirada',
  documentAdded: 'Documento Adicionado',
  noteAdded: 'Nota Adicionada',
  issueReported: 'Problema Reportado',
  inspectionDue: 'Inspeção Pendente',
  inspectionPassed: 'Inspeção Aprovada',
  planReceived: 'Planta Recebida',
  startDate: 'Data de Início',
  deadline: 'Prazo Final',
  foreman: 'Encarregado',
  worker: 'Trabalhador',
  manager: 'Gerente',
}

export type LotIconKey = keyof typeof lotIcons
