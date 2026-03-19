"use client";

import { formatDistanceToNow } from "date-fns";
import { UrgencyBadge } from "./StatusBadge";
import { StatusStepper } from "./StatusStepper";
import { Package, User, Truck } from "lucide-react";

interface MaterialRequest {
  id: string;
  material_name: string;
  quantity: number;
  unit: string;
  status: string;
  urgency_level: string;
  requested_at: string;
  requested_by_name: string | null;
  delivered_by_name: string | null;
  delivery_notes: string | null;
  in_transit_at: string | null;
  delivered_at: string | null;
  notes: string | null;
  urgency_reason: string | null;
  lot: { lot_number: string } | null;
  jobsite: { name: string } | null;
}

export function TransactionCard({ request }: { request: MaterialRequest }) {
  const lotNumber = request.lot?.lot_number ?? "—";
  const siteName = request.jobsite?.name ?? "";
  const timeAgo = formatDistanceToNow(new Date(request.requested_at), {
    addSuffix: true,
  });

  const urgencyBorder =
    request.urgency_level === "critical"
      ? "border-l-4 border-l-critical"
      : request.urgency_level === "high"
        ? "border-l-4 border-l-orange-400"
        : "";

  return (
    <div className={`bg-card rounded-xl border border-border p-4 space-y-2.5 ${urgencyBorder}`}>
      {/* Header: material + lot */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Package size={16} className="text-brand shrink-0" />
          <span className="font-semibold text-text truncate">{request.material_name}</span>
          <span className="text-sm text-text-secondary">x{request.quantity}</span>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-medium text-text-secondary">Lot {lotNumber}</div>
          {siteName && <div className="text-xs text-text-muted">{siteName}</div>}
        </div>
      </div>

      {/* Stepper (read-only) */}
      <StatusStepper status={request.status} />

      {/* People involved */}
      <div className="flex items-center gap-3 text-xs text-text-muted">
        <span className="flex items-center gap-1">
          <User size={12} />
          {request.requested_by_name || "—"}
        </span>
        {request.delivered_by_name && (
          <span className="flex items-center gap-1">
            <Truck size={12} />
            {request.delivered_by_name}
          </span>
        )}
      </div>

      {/* Meta line */}
      <div className="flex items-center gap-2 text-xs text-text-muted flex-wrap">
        <span>{timeAgo}</span>
        <UrgencyBadge urgency={request.urgency_level} />
        {request.delivery_notes && (
          <>
            <span>&middot;</span>
            <span className="text-text-secondary italic">{request.delivery_notes}</span>
          </>
        )}
      </div>
    </div>
  );
}
