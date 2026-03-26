"use client";

import { getStatusColors } from "@/lib/status";

const URGENCY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "text-text-muted" },
  medium: { label: "Normal", color: "text-warning" },
  high: { label: "High", color: "text-orange-500" },
  critical: { label: "Urgent", color: "text-critical" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = getStatusColors(status);
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

export function UrgencyBadge({ urgency }: { urgency: string }) {
  if (urgency === "medium" || urgency === "low") return null;
  const config = URGENCY_CONFIG[urgency] ?? URGENCY_CONFIG.medium;
  return (
    <span className={`text-sm font-semibold ${config.color}`}>
      {urgency === "critical" ? "!!! " : "! "}
      {config.label}
    </span>
  );
}
