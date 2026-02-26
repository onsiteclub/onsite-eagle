export function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'nunca';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'agora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d atrás`;
  const months = Math.floor(days / 30);
  return `${months}m atrás`;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function formatCurrency(n: number): string {
  return `$${n.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export const statusConfig: Record<string, { label: string; dot: string; bg: string; border: string }> = {
  live:        { label: 'LIVE',   dot: '#2BA84A', bg: '#2BA84A12', border: '#2BA84A30' },
  beta:        { label: 'BETA',   dot: '#F5A623', bg: '#F5A62312', border: '#F5A62330' },
  development: { label: 'DEV',    dot: '#2563EB', bg: '#2563EB12', border: '#2563EB30' },
  planned:     { label: 'TBD',    dot: '#9CA3AF', bg: '#9CA3AF12', border: '#9CA3AF30' },
};
