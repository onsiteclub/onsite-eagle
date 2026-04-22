import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const MONTH_SHORT_PT: Record<number, string> = {
  0: 'JAN', 1: 'FEV', 2: 'MAR', 3: 'ABR', 4: 'MAI', 5: 'JUN',
  6: 'JUL', 7: 'AGO', 8: 'SET', 9: 'OUT', 10: 'NOV', 11: 'DEZ',
}

/** "18 ABR" — curto, uppercase, mês em pt-BR. */
export function formatDateShortPt(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate
  return `${String(d.getDate()).padStart(2, '0')} ${MONTH_SHORT_PT[d.getMonth()]}`
}

/** "09:23" — 24h. */
export function formatTime24(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate
  return format(d, 'HH:mm')
}

/** "há 23 min", "há 2 horas", etc. */
export function formatRelativeAgo(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate
  return formatDistanceToNow(d, { addSuffix: true, locale: ptBR })
}

/** Retorna data ISO de 7 dias atrás (meia-noite UTC). */
export function daysAgoISO(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}
