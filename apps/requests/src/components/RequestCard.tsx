"use client";

import { formatDistanceToNow } from "date-fns";
import { StatusBadge, UrgencyBadge } from "./StatusBadge";
import { Package } from "lucide-react";

interface MaterialRequest {
  id: string;
  material_name: string;
  quantity: number;
  unit: string;
  status: string;
  urgency_level: string;
  requested_at: string;
  notes?: string | null;
  urgency_reason?: string | null;
  lot?: { lot_number: string } | null;
}

export function RequestCard({ request }: { request: MaterialRequest }) {
  const lotNumber = request.lot?.lot_number ?? "—";
  const timeAgo = formatDistanceToNow(new Date(request.requested_at), {
    addSuffix: true,
  });

  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Package size={16} className="text-brand shrink-0" />
          <span className="font-semibold text-text truncate">
            {request.material_name}
          </span>
        </div>
        <StatusBadge status={request.status} />
      </div>

      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <span>
          x{request.quantity} {request.unit}
        </span>
        <span className="text-text-muted">&middot;</span>
        <span>Lot {lotNumber}</span>
        <span className="text-text-muted">&middot;</span>
        <span className="text-text-muted">{timeAgo}</span>
      </div>

      {(request.urgency_level === "high" || request.urgency_level === "critical") && (
        <UrgencyBadge urgency={request.urgency_level} />
      )}

      {(request.notes || request.urgency_reason) && (
        <p className="text-sm text-text-secondary italic">
          {request.notes || request.urgency_reason}
        </p>
      )}
    </div>
  );
}
