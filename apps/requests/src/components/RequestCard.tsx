"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { StatusStepper } from "./StatusStepper";
import { DeadlineBadge, DeadlineBar } from "./DeadlineBadge";

const CONTEST_REASONS = [
  { value: "not_received", label: "Not received" },
  { value: "wrong_material", label: "Wrong material" },
  { value: "wrong_quantity", label: "Wrong quantity" },
  { value: "damaged", label: "Damaged" },
];

interface MaterialRequest {
  id: string;
  material_name: string;
  quantity: number;
  unit: string;
  status: string;
  urgency_level: string;
  requested_at: string;
  in_transit_at?: string | null;
  delivered_at?: string | null;
  requested_by_name?: string | null;
  notes?: string | null;
  urgency_reason?: string | null;
  delivered_by_name?: string | null;
  delivery_notes?: string | null;
  photo_url?: string | null;
  lot?: { lot_number: string } | null;
}

const STATUS_BORDER: Record<string, string> = {
  requested: "#DC2626",
  acknowledged: "#F59E0B",
  in_transit: "#0F766E",
  delivered: "#D1D5DB",
  problem: "#EF4444",
  cancelled: "#9CA3AF",
};

const URGENCY_COLORS: Record<string, string> = {
  critical: "#DC2626",
  high: "#F59E0B",
  medium: "#C58B1B",
  low: "#9CA3AF",
};

export function RequestCard({ request, onUpdate }: { request: MaterialRequest; onUpdate?: () => void }) {
  const lotNumber = request.lot?.lot_number ?? null;
  const borderColor = STATUS_BORDER[request.status] || "#D1D5DB";
  const urgencyColor = URGENCY_COLORS[request.urgency_level] || "#9CA3AF";

  const [contesting, setContesting] = useState(false);
  const [contestReason, setContestReason] = useState<string | null>(null);
  const [contestNote, setContestNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitContest() {
    if (!contestReason) return;
    setSubmitting(true);
    const label = CONTEST_REASONS.find((r) => r.value === contestReason)?.label ?? contestReason;
    const note = contestNote.trim()
      ? `Worker: ${label} — ${contestNote.trim()}`
      : `Worker: ${label}`;

    await fetch("/api/requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: request.id,
        status: "problem",
        delivery_notes: note,
      }),
    });

    setSubmitting(false);
    setContesting(false);
    setContestReason(null);
    setContestNote("");
    onUpdate?.();
  }

  return (
    <div
      className="bg-card rounded-xl border border-border overflow-hidden shadow-sm"
      style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}
    >
      <div className="p-3.5">
        {/* Row 1: Lot number (prominent) */}
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: urgencyColor }}
          />
          <span className="font-bold text-text text-[17px] truncate flex-1">
            {lotNumber ? `Lot ${lotNumber}` : "—"}
          </span>
        </div>

        {/* Row 2: material + requester + deadline */}
        <div className="flex items-center gap-2 ml-[18px] mt-0.5">
          <span className="text-[13px] text-text-secondary truncate">
            {request.material_name}
            {request.quantity ? ` x${request.quantity}` : ""}
            {request.requested_by_name ? ` \u00b7 ${request.requested_by_name}` : ""}
          </span>
          <DeadlineBadge
            requestedAt={request.requested_at}
            urgency={request.urgency_level}
            status={request.status}
            compact
          />
        </div>

        {/* Notes */}
        {(request.notes || request.urgency_reason) && (
          <p className="text-[13px] text-text-secondary italic ml-[18px] mt-1.5 line-clamp-2">
            {request.notes || request.urgency_reason}
          </p>
        )}

        {/* Deadline bar */}
        <div className="mt-2 ml-[18px]">
          <DeadlineBar requestedAt={request.requested_at} urgency={request.urgency_level} status={request.status} />
        </div>

        {/* Stepper (read-only) */}
        <div className="mt-3">
          <StatusStepper
            status={request.status}
            timestamps={{
              requested_at: request.requested_at,
              in_transit_at: request.in_transit_at,
              delivered_at: request.delivered_at,
            }}
          />
        </div>

        {/* Delivery info (if delivered) */}
        {request.status === "delivered" && request.delivered_by_name && (
          <div className="ml-[18px] mt-2 bg-green-50 rounded-lg px-3 py-2">
            <p className="text-[13px] text-green-700 font-medium">
              Delivered by {request.delivered_by_name}
            </p>
            {request.delivery_notes && (
              <p className="text-[12px] text-green-600 mt-0.5">{request.delivery_notes}</p>
            )}
          </div>
        )}

        {/* Contest delivery — worker can report issue */}
        {request.status === "delivered" && !contesting && (
          <div className="ml-[18px] mt-2">
            <button
              onClick={() => setContesting(true)}
              className="text-xs text-text-muted hover:text-amber-600 transition"
            >
              Something wrong?
            </button>
          </div>
        )}

        {request.status === "delivered" && contesting && (
          <div className="ml-[18px] mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2.5">
            <p className="text-sm font-medium text-amber-800">What happened?</p>
            <div className="grid grid-cols-2 gap-1.5">
              {CONTEST_REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setContestReason(r.value)}
                  className={`px-2.5 py-2 rounded-lg border text-xs font-medium text-left transition active:scale-[0.97] ${
                    contestReason === r.value
                      ? "border-amber-500 bg-amber-100 text-amber-800"
                      : "border-border bg-white text-text hover:border-amber-300"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {contestReason && (
              <textarea
                value={contestNote}
                onChange={(e) => setContestNote(e.target.value)}
                placeholder="Details (optional)"
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm text-text outline-none focus:ring-2 focus:ring-amber-200 resize-none"
              />
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setContesting(false); setContestReason(null); setContestNote(""); }}
                className="px-3 py-2 text-xs text-text-secondary bg-white border border-border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitContest}
                disabled={!contestReason || submitting}
                className="flex-1 flex items-center justify-center gap-1.5 bg-amber-600 text-white font-medium py-2 px-3 rounded-lg text-xs hover:bg-amber-700 active:scale-[0.98] transition disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    <AlertTriangle size={14} />
                    Report Issue
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Problem info */}
        {request.status === "problem" && request.delivery_notes && (
          <div className="ml-[18px] mt-2 bg-red-50 rounded-lg px-3 py-2">
            <p className="text-[13px] text-red-700 font-medium">
              {request.delivery_notes}
            </p>
            {request.delivered_by_name && (
              <p className="text-[12px] text-red-600 mt-0.5">
                Reported by {request.delivered_by_name}
              </p>
            )}
          </div>
        )}

        {/* Delivery photo thumbnail */}
        {request.photo_url && (
          <div className="ml-[18px] mt-2">
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
    </div>
  );
}
