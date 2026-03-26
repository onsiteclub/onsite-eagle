/**
 * Canonical status labels, colors, and icons for request lifecycle.
 * Single source of truth — use this everywhere instead of inline strings.
 */

export const STATUS_CONFIG = {
  requested: { label: "Waiting", bg: "bg-amber-100", text: "text-amber-700" },
  authorized: { label: "Authorized", bg: "bg-purple-100", text: "text-purple-700" },
  acknowledged: { label: "Acknowledged", bg: "bg-purple-100", text: "text-purple-700" },
  in_transit: { label: "On the way", bg: "bg-blue-100", text: "text-blue-700" },
  delivered: { label: "Delivered", bg: "bg-green-100", text: "text-green-700" },
  problem: { label: "Issue reported", bg: "bg-red-100", text: "text-red-700" },
  cancelled: { label: "Cancelled", bg: "bg-gray-100", text: "text-gray-500" },
} as const;

export type RequestStatus = keyof typeof STATUS_CONFIG;

export function getStatusLabel(status: string): string {
  return STATUS_CONFIG[status as RequestStatus]?.label ?? status;
}

export function getStatusColors(status: string) {
  return STATUS_CONFIG[status as RequestStatus] ?? STATUS_CONFIG.requested;
}
