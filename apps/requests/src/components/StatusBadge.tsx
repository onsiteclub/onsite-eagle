"use client";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  requested: { label: "Requested", bg: "bg-gray-100", text: "text-gray-700" },
  authorized: { label: "Authorized", bg: "bg-purple-100", text: "text-purple-700" },
  acknowledged: { label: "Acknowledged", bg: "bg-purple-100", text: "text-purple-700" },
  in_transit: { label: "In Transit", bg: "bg-cyan-100", text: "text-cyan-700" },
  delivered: { label: "Delivered", bg: "bg-green-100", text: "text-green-700" },
  cancelled: { label: "Cancelled", bg: "bg-red-100", text: "text-red-700" },
};

const URGENCY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "text-text-muted" },
  medium: { label: "Normal", color: "text-warning" },
  high: { label: "High", color: "text-orange-500" },
  critical: { label: "Urgent", color: "text-critical" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.requested;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

export function UrgencyBadge({ urgency }: { urgency: string }) {
  if (urgency === "medium" || urgency === "low") return null;
  const config = URGENCY_CONFIG[urgency] ?? URGENCY_CONFIG.medium;
  return (
    <span className={`text-xs font-semibold ${config.color}`}>
      {urgency === "critical" ? "!!! " : "! "}
      {config.label}
    </span>
  );
}
