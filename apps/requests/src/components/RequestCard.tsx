"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, AlertCircle, ChevronDown, RotateCcw } from "lucide-react";
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
  sub_items?: { name: string; status: string }[] | null;
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
  const [itemsOpen, setItemsOpen] = useState(false);
  const [missingMode, setMissingMode] = useState(false);
  const [selectedMissing, setSelectedMissing] = useState<Set<number>>(new Set());

  const hasSubItems = request.sub_items && request.sub_items.length > 0;
  const missingCount = request.sub_items?.filter((i) => i.status === "missing").length ?? 0;

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

  function toggleMissingItem(idx: number) {
    setSelectedMissing((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  async function submitMissingItems() {
    if (!request.sub_items || selectedMissing.size === 0) return;
    setSubmitting(true);

    // Mark selected items as missing, rest stay as-is
    const updated = request.sub_items.map((item, i) =>
      selectedMissing.has(i)
        ? { ...item, status: "missing" }
        : item
    );

    // Send back to queue with missing items marked
    await fetch("/api/requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: request.id,
        status: "requested",
        sub_items: updated,
        delivery_notes: `Worker: ${selectedMissing.size} item(s) missing`,
      }),
    });

    setSubmitting(false);
    setMissingMode(false);
    setSelectedMissing(new Set());
    onUpdate?.();
  }

  return (
    <div
      className="bg-card rounded-xl border border-border overflow-hidden shadow-sm"
      style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}
    >
      <div className="p-3.5">
        {/* Row 1: Lot number */}
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: urgencyColor }}
          />
          <span className="font-bold text-text text-lg truncate flex-1">
            {lotNumber ? `Lot ${lotNumber}` : "—"}
          </span>
          <DeadlineBadge
            requestedAt={request.requested_at}
            urgency={request.urgency_level}
            status={request.status}
            compact
          />
        </div>

        {/* Row 2: Material name — expandable if has sub-items */}
        <div className="ml-[18px] mt-0.5">
          {hasSubItems ? (
            <button
              type="button"
              onClick={() => setItemsOpen(!itemsOpen)}
              className="flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text transition w-full text-left"
            >
              <span className="truncate">{request.material_name}</span>
              {missingCount > 0 && (
                <span className="shrink-0 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                  {missingCount} missing
                </span>
              )}
              <ChevronDown
                size={12}
                className={`shrink-0 text-text-muted transition-transform ${itemsOpen ? "rotate-180" : ""}`}
              />
            </button>
          ) : (
            <span className="text-sm text-text-secondary">
              {request.material_name}
              {request.requested_by_name ? ` · ${request.requested_by_name}` : ""}
            </span>
          )}
        </div>

        {/* Sub-items dropdown */}
        {hasSubItems && itemsOpen && (
          <div className="ml-[18px] mt-2 space-y-1">
            {request.sub_items!.map((item, idx) => {
              const isMissing = item.status === "missing";
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm ${
                    isMissing
                      ? "bg-amber-50 border border-amber-200"
                      : "bg-gray-50 border border-transparent"
                  }`}
                >
                  <span className={`flex-1 ${isMissing ? "text-amber-700 font-medium" : "text-text-secondary"}`}>
                    {item.name}
                  </span>
                  {isMissing && (
                    <span className="text-[11px] text-amber-600 font-medium flex items-center gap-0.5">
                      <AlertCircle size={10} />
                      Missing
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Notes */}
        {(request.notes || request.urgency_reason) && (
          <p className="text-sm text-text-secondary italic ml-[18px] mt-1.5 line-clamp-2">
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
            <p className="text-sm text-green-700 font-medium">
              Delivered by {request.delivered_by_name}
            </p>
            {request.delivery_notes && (
              <p className="text-sm text-green-600 mt-0.5">{request.delivery_notes}</p>
            )}
          </div>
        )}

        {/* ─── AFTER DELIVERY: worker actions ─── */}
        {request.status === "delivered" && !contesting && !missingMode && (
          <div className="ml-[18px] mt-2 flex items-center gap-3">
            <button
              onClick={() => setContesting(true)}
              className="text-sm text-text-muted hover:text-amber-600 transition"
            >
              Something wrong?
            </button>
            {hasSubItems && (
              <button
                onClick={() => { setMissingMode(true); setItemsOpen(true); }}
                className="text-sm text-text-muted hover:text-amber-600 transition"
              >
                Items missing?
              </button>
            )}
          </div>
        )}

        {/* ─── MISSING ITEMS MODE: worker selects which items are missing ─── */}
        {request.status === "delivered" && missingMode && hasSubItems && (
          <div className="ml-[18px] mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2.5">
            <p className="text-sm font-medium text-amber-800">Which items are missing?</p>
            <div className="space-y-1">
              {request.sub_items!.map((item, idx) => {
                const isSelected = selectedMissing.has(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleMissingItem(idx)}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-left transition active:scale-[0.98] ${
                      isSelected
                        ? "bg-amber-200/60 border border-amber-300 text-amber-800 font-medium"
                        : "bg-white border border-border text-text-secondary hover:border-amber-300"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                      isSelected ? "bg-amber-600 text-white" : "border-2 border-gray-300"
                    }`}>
                      {isSelected && <AlertCircle size={10} />}
                    </div>
                    {item.name}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setMissingMode(false); setSelectedMissing(new Set()); }}
                className="px-3 py-2 text-xs text-text-secondary bg-white border border-border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitMissingItems}
                disabled={selectedMissing.size === 0 || submitting}
                className="flex-1 flex items-center justify-center gap-1.5 bg-amber-600 text-white font-medium py-2 px-3 rounded-lg text-xs hover:bg-amber-700 active:scale-[0.98] transition disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    <RotateCcw size={14} />
                    Send Back to Queue
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ─── CONTEST DELIVERY (general issues) ─── */}
        {request.status === "delivered" && contesting && (
          <div className="ml-[18px] mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2.5">
            <p className="text-sm font-medium text-amber-800">What happened?</p>
            <div className="grid grid-cols-2 gap-1.5">
              {CONTEST_REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setContestReason(r.value)}
                  className={`px-2.5 py-2.5 rounded-lg border text-sm font-medium text-left transition active:scale-[0.97] ${
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
            <p className="text-sm text-red-700 font-medium">
              {request.delivery_notes}
            </p>
            {request.delivered_by_name && (
              <p className="text-sm text-red-600 mt-0.5">
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
