"use client";

import { useState } from "react";
import { UrgencyBadge } from "./StatusBadge";
import { StatusStepper } from "./StatusStepper";
import { DeadlineBadge, DeadlineBar } from "./DeadlineBadge";
import { formatRequestTime, getDeadlineInfo } from "@/lib/deadline";
import { Package, User, Truck, AlertTriangle, Loader2, Plus } from "lucide-react";

interface MaterialRequest {
  id: string;
  lot_id?: string;
  material_name: string;
  quantity: number;
  unit: string;
  status: string;
  urgency_level: string;
  requested_at: string;
  requested_by_name: string | null;
  delivered_by_name: string | null;
  delivery_notes: string | null;
  photo_url: string | null;
  in_transit_at: string | null;
  delivered_at: string | null;
  notes: string | null;
  urgency_reason: string | null;
  sub_items?: { name: string; status: string }[] | null;
  lot: { lot_number: string } | null;
  jobsite: { name: string } | null;
}

export function TransactionCard({ request, onUpdate, onNewRequest }: {
  request: MaterialRequest;
  onUpdate?: () => void;
  onNewRequest?: (lotId: string, lotLabel: string) => void;
}) {
  const [urgencyLoading, setUrgencyLoading] = useState(false);
  const lotNumber = request.lot?.lot_number ?? "—";
  const siteName = request.jobsite?.name ?? "";

  const isActiveStatus = !["delivered", "cancelled"].includes(request.status);
  const deadlineInfo = isActiveStatus ? getDeadlineInfo(request.requested_at, request.urgency_level) : null;
  const isUrgentDeadline = deadlineInfo && (deadlineInfo.status === "warning" || deadlineInfo.status === "urgent" || deadlineInfo.status === "overdue");
  const canMarkUrgent = isActiveStatus && request.urgency_level !== "critical";

  async function handleMarkUrgent() {
    setUrgencyLoading(true);
    await fetch("/api/requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: request.id, urgency_level: "critical" }),
    });
    setUrgencyLoading(false);
    onUpdate?.();
  }

  const urgencyBorder =
    request.urgency_level === "critical"
      ? "border-l-4 border-l-critical"
      : request.urgency_level === "high"
        ? "border-l-4 border-l-orange-400"
        : "";

  return (
    <div className={`rounded-xl border border-border p-4 space-y-2.5 ${urgencyBorder} ${
      isUrgentDeadline ? "bg-amber-50/80 border-amber-300" : "bg-card"
    }`}>
      {/* Header: Lot (prominent) + [+] + site */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Package size={16} className="text-brand shrink-0" />
          <span className="font-bold text-text text-[17px]">Lot {lotNumber}</span>
          {onNewRequest && request.lot_id && (
            <button
              type="button"
              onClick={() => onNewRequest(request.lot_id!, `Lot ${lotNumber}${siteName ? ` — ${siteName}` : ""}`)}
              className="w-6 h-6 rounded-full flex items-center justify-center bg-brand/10 text-brand hover:bg-brand/20 active:scale-90 transition shrink-0"
              title="New request for this lot"
            >
              <Plus size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>
        {siteName && <span className="text-xs text-text-muted shrink-0">{siteName}</span>}
      </div>

      {/* Material + quantity */}
      <div className="text-[13px] text-text-secondary">
        {request.material_name} x{request.quantity}
      </div>

      {/* Deadline bar */}
      <DeadlineBar requestedAt={request.requested_at} urgency={request.urgency_level} status={request.status} />

      {/* Stepper (read-only) */}
      <StatusStepper
        status={request.status}
        timestamps={{
          requested_at: request.requested_at,
          in_transit_at: request.in_transit_at,
          delivered_at: request.delivered_at,
        }}
      />

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

      {/* Meta line: time + deadline + urgency */}
      <div className="flex items-center gap-2 text-xs text-text-muted flex-wrap">
        <span>{formatRequestTime(request.requested_at)}</span>
        <DeadlineBadge
          requestedAt={request.requested_at}
          urgency={request.urgency_level}
          status={request.status}
          compact
        />
        <UrgencyBadge urgency={request.urgency_level} />
        {request.delivery_notes && (
          <>
            <span>&middot;</span>
            <span className="text-text-secondary italic">{request.delivery_notes}</span>
          </>
        )}
      </div>

      {/* Delivery photo */}
      {request.photo_url && (
        <a href={request.photo_url} target="_blank" rel="noopener noreferrer">
          <img
            src={request.photo_url}
            alt="Delivery photo"
            className="w-20 h-20 object-cover rounded-lg border border-border hover:opacity-80 transition"
          />
        </a>
      )}

      {/* Supervisor: Mark as Urgent */}
      {canMarkUrgent && (
        <button
          onClick={handleMarkUrgent}
          disabled={urgencyLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-700 bg-amber-100 border border-amber-200 hover:bg-amber-200 active:scale-[0.97] transition disabled:opacity-50"
        >
          {urgencyLoading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <AlertTriangle size={12} />
          )}
          Mark Urgent
        </button>
      )}
    </div>
  );
}
