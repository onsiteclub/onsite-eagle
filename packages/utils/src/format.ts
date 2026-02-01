// ============================================
// DATE FORMATTING
// ============================================

export function formatDate(date: string | Date | null | undefined, format?: string): string {
  if (!date) return '-';
  const d = new Date(date);

  if (format === 'dd/MM HH:mm') {
    return d.toLocaleString('en-US', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelative(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes && minutes !== 0) return '-';
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// ============================================
// STRING UTILITIES
// ============================================

export function truncate(str: string | null | undefined, length: number = 50): string {
  if (!str) return '-';
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function capitalize(str: string | null | undefined): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ============================================
// NUMBER UTILITIES
// ============================================

export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '-';
  return num.toLocaleString('en-US');
}

export function formatPercent(num: number | null | undefined, decimals: number = 0): string {
  if (num === null || num === undefined) return '-';
  return `${num.toFixed(decimals)}%`;
}

export function formatCurrency(num: number | null | undefined, currency: string = 'CAD'): string {
  if (num === null || num === undefined) return '-';
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
  }).format(num);
}
