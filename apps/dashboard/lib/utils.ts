import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...options,
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatCurrency(amount: number, currency = 'CAD') {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatMinutesToHours(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}min`
}

// Adaptado para usar 'nome' como campo único
export function getInitials(nome?: string | null): string {
  if (!nome) return 'U'
  
  const parts = nome.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return nome.substring(0, 2).toUpperCase()
}

// Extrai primeiro nome do campo 'nome'
export function getFirstName(nome?: string | null): string {
  if (!nome) return 'User'
  return nome.trim().split(' ')[0]
}

export function getLevelColor(level: string) {
  const colors: Record<string, string> = {
    rookie: 'bg-gray-100 text-gray-800',
    apprentice: 'bg-blue-100 text-blue-800',
    journeyman: 'bg-green-100 text-green-800',
    master: 'bg-purple-100 text-purple-800',
    legend: 'bg-yellow-100 text-yellow-800',
  }
  return colors[level] || colors.rookie
}

export function getSubscriptionBadge(status: string) {
  const badges: Record<string, { label: string; color: string }> = {
    trialing: { label: 'Trial', color: 'bg-blue-100 text-blue-800' },
    active: { label: 'Ativo', color: 'bg-green-100 text-green-800' },
    past_due: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
    canceled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
    none: { label: 'Sem plano', color: 'bg-gray-100 text-gray-800' },
  }
  return badges[status] || badges.none
}
