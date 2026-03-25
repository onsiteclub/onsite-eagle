"use client";

import { useState } from "react";
import { UrgencyBadge } from "./StatusBadge";
import { StatusStepper } from "./StatusStepper";
import { DeadlineBadge, DeadlineBar } from "./DeadlineBadge";
import { formatRequestTime, getDeadlineInfo } from "@/lib/deadline";
import { Package, User, Truck, AlertTriangle, Loader2, Plus, Clock } from "lucide-react";

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

export function TransactionCard({ request, onUpdate, onNewRequest, supervisorName }: {
  request: MaterialRequest;
  onUpdate?: () => void;
  onNewRequest?: (lotId: string, lotLabel: string) => void;
  supervisorName?: string;
}) {
  const [urgencyLoading, setUrgencyLoading] = useState(false);
  const [overrideLoading, setOverrideLoading] = useState(false);
  const lotNumber = request.lot?.lot_number ?? "—";
  const siteName = request.jobsite?.name ?? "";

  const isActiveStatus = !["delivered", "cancelled"].includes(request.status);
  const deadlineInfo = isActiveStatus ? getDeadlineInfo(request.requested_at, request.urgency_level) : null;
  const isUrgentDeadline = deadlineInfo && (deadlineInfo.status === "warning" || deadlineInfo.status === "urgent" || deadlineInfo.status === "overdue");
  const canMarkUrgent = isActiveStatus && request.urgency_level !== "critical";

  const isInTransit = request.status === "in_transit";
  const isProblem = request.status === "problem";
  const missingItems = request.sub_items?.filter((i) => i.status === "missing") ?? [];
  const hasMissing = missingItems.length > 0;
  const hasIssue = isProblem || hasMissing;

  // Detect overrideable problems (Not Safe / Not Ready)
  const canOverride = isProblem && supervisorName && request.delivery_notes &&
    (request.delivery_notes.startsWith("Not Safe") || request.delivery_notes.startsWith("Not Ready"));

  async function handleOverride() {
    if (!supervisorName) return;
    setOverrideLoading(true);
    await fetch("/api/requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: request.id,
        status: "in_transit",
        delivery_notes: `[Override by ${supervisorName}] ${request.delivery_notes}`,
      }),
    });
    setOverrideLoading(false);
    onUpdate?.();
  }

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

  return (
    <div className={`rounded-xl overflow-hidden border space-y-0 ${
      isInTransit
        ? "bg-blue-50/60 border-2 border-blue-300 ring-2 ring-blue-100 shadow-md"
        : hasIssue
          ? "border-red-200 bg-white"
          : isUrgentDeadline
            ? "bg-amber-50/80 border-amber-300"
            : "border-border bg-card"
    } ${
      !isInTransit && request.urgency_level === "critical"
        ? "border-l-4 border-l-critical"
        : !isInTransit && request.urgency_level === "high"
          ? "border-l-4 border-l-orange-400"
          : ""
    }`}>

      {/* In Transit banner */}
      {isInTransit && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border-b border-blue-200">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <Truck size={13} className="text-blue-600" />
          <span className="text-sm font-bold text-blue-700 uppercase tracking-wide">In Transit</span>
          {request.delivered_by_name && (
            <span className="text-sm text-blue-600 ml-auto">{request.delivered_by_name}</span>
          )}
        </div>
      )}

      {/* === TOP SECTION: Lot + Material === */}
      <div className="px-4 pt-3 pb-2 space-y-1">
        {/* Row 1: Lot number (H1) + site + urgency */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-text text-lg leading-tight">Lot {lotNumber}</span>
            {onNewRequest && request.lot_id && (
              <button
                type="button"
                onClick={() => onNewRequest(request.lot_id!, `Lot ${lotNumber}${siteName ? ` — ${siteName}` : ""}`)}
                className="w-5 h-5 rounded-full flex items-center justify-center bg-brand/10 text-brand hover:bg-brand/20 active:scale-90 transition shrink-0"
                title="New request for this lot"
              >
                <Plus size={12} strokeWidth={2.5} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <UrgencyBadge urgency={request.urgency_level} />
            {siteName && <span className="text-sm text-text-muted">{siteName}</span>}
          </div>
        </div>

        {/* Row 2: Material + quantity (prominent) */}
        <div className="flex items-center gap-2">
          <Package size={14} className="text-text-muted shrink-0" />
          <span className="text-sm font-medium text-text">{request.material_name}</span>
          <span className="text-sm text-text-muted">x{request.quantity}</span>
        </div>
      </div>

      {/* === ISSUE BOX (problem or missing items) === */}
      {hasIssue && (
        <div className="mx-3 mb-2 bg-white border border-red-200 rounded-lg p-3 space-y-2">
          {isProblem && request.delivery_notes && (
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-sm font-bold text-red-700 uppercase tracking-wide">Problem</span>
                <p className="text-sm text-red-800 mt-0.5">{request.delivery_notes}</p>
              </div>
            </div>
          )}
          {isProblem && !request.delivery_notes && (
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-500" />
              <span className="text-sm font-bold text-red-700 uppercase tracking-wide">Problem reported</span>
            </div>
          )}
          {/* Problem photo */}
          {isProblem && request.photo_url && (
            <a href={request.photo_url} target="_blank" rel="noopener noreferrer">
              <img
                src={request.photo_url}
                alt="Problem evidence"
                className="w-full h-32 object-cover rounded-lg border border-red-100 hover:opacity-80 transition"
              />
            </a>
          )}
          {hasMissing && (
            <div>
              <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">Missing items</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {missingItems.map((i) => (
                  <span
                    key={i.name}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-red-700 text-sm font-medium border border-red-100"
                  >
                    <AlertTriangle size={9} />
                    {i.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {/* Supervisor override button */}
          {canOverride && (
            <button
              onClick={handleOverride}
              disabled={overrideLoading}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 active:scale-[0.97] transition disabled:opacity-50 mt-1"
            >
              {overrideLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <>
                  <Package size={14} />
                  Override — Authorize Delivery
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* === TIMELINE === */}
      <div className="px-4 py-2">
        <DeadlineBar requestedAt={request.requested_at} urgency={request.urgency_level} status={request.status} />
        <div className="mt-2">
          <StatusStepper
            status={request.status}
            timestamps={{
              requested_at: request.requested_at,
              in_transit_at: request.in_transit_at,
              delivered_at: request.delivered_at,
            }}
          />
        </div>
      </div>

      {/* === FOOTER: meta info compact === */}
      <div className="px-4 pb-3 flex items-center justify-between gap-2">
        {/* Left: people + time */}
        <div className="flex items-center gap-2 text-sm text-text-muted min-w-0 flex-wrap">
          <span className="flex items-center gap-1">
            <User size={11} />
            {request.requested_by_name || "—"}
          </span>
          {request.delivered_by_name && !isInTransit && (
            <span className="flex items-center gap-1">
              <Truck size={11} />
              {request.delivered_by_name}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {formatRequestTime(request.requested_at)}
          </span>
        </div>

        {/* Right: deadline + actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <DeadlineBadge
            requestedAt={request.requested_at}
            urgency={request.urgency_level}
            status={request.status}
            compact
          />
          {canMarkUrgent && (
            <button
              onClick={handleMarkUrgent}
              disabled={urgencyLoading}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-amber-700 bg-amber-100 border border-amber-200 hover:bg-amber-200 active:scale-[0.97] transition disabled:opacity-50"
            >
              {urgencyLoading ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <AlertTriangle size={10} />
              )}
              Urgent
            </button>
          )}
        </div>
      </div>

      {/* Delivery notes (when not a problem — problem notes are in the issue box) */}
      {request.delivery_notes && !isProblem && (
        <div className="px-4 pb-3 -mt-1">
          <p className="text-sm text-text-secondary italic">{request.delivery_notes}</p>
        </div>
      )}

      {/* Delivery photo */}
      {request.photo_url && (
        <div className="px-4 pb-3">
          <a href={request.photo_url} target="_blank" rel="noopener noreferrer">
            <img
              src={request.photo_url}
              alt="Delivery photo"
              className="w-20 h-20 object-cover rounded-lg border border-border hover:opacity-80 transition"
            />
          </a>
        </div>
      )}
    </div>
  );
}
