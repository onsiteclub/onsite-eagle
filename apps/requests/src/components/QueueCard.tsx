"use client";

import { useState, useRef, useEffect } from "react";
import { CheckCircle, Camera, AlertTriangle, RotateCcw, AlertCircle, ChevronDown, Truck } from "lucide-react";
import { StatusStepper } from "./StatusStepper";
import { DeadlineBar } from "./DeadlineBadge";
import { getDeadlineInfo } from "@/lib/deadline";

interface MaterialRequest {
  id: string;
  material_name: string;
  quantity: number;
  unit: string;
  status: string;
  urgency_level: string;
  requested_at: string;
  in_transit_at: string | null;
  delivered_at: string | null;
  requested_by_name: string | null;
  notes: string | null;
  urgency_reason: string | null;
  sub_items: { name: string; status: string }[] | null;
  lot: { lot_number: string; address: string | null } | null;
  jobsite?: { name: string } | null;
}

const STATUS_BORDER: Record<string, string> = {
  requested: "#DC2626",
  acknowledged: "#F59E0B",
  in_transit: "#0F766E",
  delivered: "#D1D5DB",
  problem: "#EF4444",
};

const URGENCY_COLORS: Record<string, string> = {
  critical: "#DC2626",
  high: "#F59E0B",
  medium: "#C58B1B",
  low: "#9CA3AF",
};

const PROBLEM_REASONS = [
  { value: "not_in_stock", label: "Not in stock" },
  { value: "site_closed", label: "Site closed" },
  { value: "machine_down", label: "Machine down" },
  { value: "other", label: "Other" },
];

/** Compress image client-side to fit Vercel's 4.5MB body limit */
function compressImage(file: File, maxWidth: number, quality: number): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          resolve(new File([blob!], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality,
      );
    };
    img.src = URL.createObjectURL(file);
  });
}

export function QueueCard({
  request,
  operatorName,
  onUpdate,
  disabled,
  hasActiveTransit,
  onActiveChange,
  compact,
}: {
  request: MaterialRequest;
  operatorName: string;
  onUpdate: () => void;
  disabled?: boolean;
  hasActiveTransit?: boolean;
  onActiveChange?: (active: boolean) => void;
  /** Compact mode: small uniform card for queue list. No stepper, no sub-items, no deadline bar. */
  compact?: boolean;
}) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [mode, setMode] = useState<"idle" | "deliver" | "problem">("idle");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<string | null>(null);
  const [problemNotes, setProblemNotes] = useState("");
  const [itemsOpen, setItemsOpen] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);

  const lotNumber = request.lot?.lot_number ?? null;
  const borderColor = STATUS_BORDER[request.status] || "#D1D5DB";
  const urgencyColor = URGENCY_COLORS[request.urgency_level] || "#9CA3AF";

  const isActive = mode !== "idle";
  const dimmed = disabled && !isActive;

  const hasSubItems = request.sub_items && request.sub_items.length > 0;
  const missingCount = request.sub_items?.filter((i) => i.status === "missing").length ?? 0;
  const isInTransit = request.status === "in_transit";

  // Deadline-based amber glow when time is running out
  const isActiveStatus = !["delivered", "cancelled"].includes(request.status);
  const deadlineInfo = isActiveStatus ? getDeadlineInfo(request.requested_at, request.urgency_level) : null;
  const isUrgentDeadline = deadlineInfo && (deadlineInfo.status === "warning" || deadlineInfo.status === "urgent" || deadlineInfo.status === "overdue");

  useEffect(() => {
    onActiveChange?.(isActive);
  }, [isActive, onActiveChange]);

  // Auto-expand sub-items when in_transit so operator sees them
  useEffect(() => {
    if (isInTransit && hasSubItems) {
      setItemsOpen(true);
    }
  }, [isInTransit, hasSubItems]);

  function resetMode() {
    setMode("idle");
    setPhotoFile(null);
    setPhotoPreview(null);
    setDeliveryNotes("");
    setSelectedProblem(null);
    setProblemNotes("");
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Compress to max 1200px wide, ~0.7 quality JPEG (<500KB typically)
    const compressed = await compressImage(file, 1200, 0.7);
    setPhotoFile(compressed);
    setPhotoPreview(URL.createObjectURL(compressed));
  }

  async function handleStepClick(step: "in_transit" | "delivered") {
    if (step === "in_transit") {
      setActionLoading("transit");
      await fetch("/api/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: request.id,
          status: "in_transit",
          delivered_by_name: operatorName,
        }),
      });
      setActionLoading(null);
      onUpdate();
    } else if (step === "delivered") {
      // Enter delivery mode (photo is optional)
      setMode("deliver");
    }
  }

  async function handleDelivered() {
    setActionLoading("deliver");

    let photoUrl: string | undefined;
    if (photoFile) {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", photoFile);
      formData.append("request_id", request.id);

      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (uploadRes.ok) {
        const data = await uploadRes.json();
        photoUrl = data.url;
      }
      setUploading(false);
    }

    // Check if any sub-items are marked missing → partial delivery
    const hasMissingItems = request.sub_items?.some((i) => i.status === "missing");

    if (hasMissingItems) {
      // Mark non-missing items as delivered, keep missing as-is
      const updatedItems = request.sub_items!.map((item) =>
        item.status !== "missing" ? { ...item, status: "delivered" } : item
      );
      const missingNames = request.sub_items!.filter((i) => i.status === "missing").map((i) => i.name);
      const notePrefix = `[Partial] Missing: ${missingNames.join(", ")}`;
      const fullNote = deliveryNotes.trim() ? `${notePrefix}. ${deliveryNotes.trim()}` : notePrefix;

      await fetch("/api/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: request.id,
          status: "requested",
          delivered_by_name: operatorName,
          delivery_notes: fullNote,
          photo_url: photoUrl || null,
          sub_items: updatedItems,
        }),
      });
    } else {
      // Full delivery
      await fetch("/api/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: request.id,
          status: "delivered",
          delivered_by_name: operatorName,
          delivery_notes: deliveryNotes.trim() || null,
          photo_url: photoUrl || null,
        }),
      });
    }

    setActionLoading(null);
    resetMode();
    onUpdate();
  }

  async function handleProblem() {
    if (!selectedProblem) return;
    setActionLoading("problem");

    const reasonLabel = PROBLEM_REASONS.find((r) => r.value === selectedProblem)?.label ?? selectedProblem;
    const fullNote = problemNotes.trim()
      ? `${reasonLabel}: ${problemNotes.trim()}`
      : reasonLabel;

    await fetch("/api/requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: request.id,
        status: "problem",
        delivery_notes: fullNote,
        delivered_by_name: operatorName,
      }),
    });

    setActionLoading(null);
    resetMode();
    onUpdate();
  }

  async function handleResolve() {
    setActionLoading("resolve");
    await fetch("/api/requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: request.id,
        status: "requested",
        delivered_by_name: null,
        delivery_notes: null,
      }),
    });
    setActionLoading(null);
    onUpdate();
  }

  async function toggleSubItemMissing(idx: number) {
    if (!request.sub_items) return;
    const updated = request.sub_items.map((item, i) =>
      i === idx
        ? { ...item, status: item.status === "missing" ? "pending" : "missing" }
        : item
    );
    await fetch("/api/requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: request.id, sub_items: updated }),
    });
    onUpdate();
  }

  // ─── COMPACT MODE: uniform small card for queue ───
  if (compact) {
    const canStartTransit = !hasActiveTransit && request.status !== "in_transit" && request.status !== "problem";
    return (
      <div
        className={`rounded-xl overflow-hidden transition-all ${
          isUrgentDeadline
            ? "bg-amber-50/80 border border-amber-300"
            : request.status === "problem"
            ? "bg-red-50/60 border border-red-200"
            : "bg-card border border-border"
        }`}
        style={{ borderLeftWidth: 4, borderLeftColor: isUrgentDeadline ? "#F59E0B" : borderColor }}
      >
        <div className="p-3 flex items-center gap-3">
          {/* Urgency dot */}
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: urgencyColor }}
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-text text-[15px]">
                {lotNumber ? `Lot ${lotNumber}` : "—"}
              </span>
              {missingCount > 0 && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                  {missingCount} missing
                </span>
              )}
              {request.status === "problem" && (
                <span className="text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded-full">
                  Problem
                </span>
              )}
            </div>
            <p className="text-[13px] text-text-secondary truncate">
              {request.material_name}
              {request.requested_by_name ? ` · ${request.requested_by_name}` : ""}
            </p>
          </div>

          {/* Action: Start Transit button or Problem Resolve */}
          {request.status === "problem" ? (
            <button
              onClick={handleResolve}
              disabled={actionLoading !== null}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-brand text-white hover:bg-brand-dark active:scale-[0.97] transition disabled:opacity-50"
            >
              <RotateCcw size={12} />
              Resolve
            </button>
          ) : canStartTransit ? (
            <button
              onClick={() => handleStepClick("in_transit")}
              disabled={actionLoading !== null}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-500 text-white hover:bg-blue-600 active:scale-[0.97] transition disabled:opacity-50"
            >
              {actionLoading === "transit" ? (
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Truck size={12} />
                  Go
                </>
              )}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl overflow-hidden transition-all ${
        isInTransit
          ? "bg-brand/5 border-2 border-brand/40 ring-2 ring-brand/15 shadow-lg"
          : dimmed
          ? "bg-card border border-border opacity-40 pointer-events-none shadow-sm"
          : isUrgentDeadline
          ? "bg-amber-50/80 border border-amber-300 shadow-sm"
          : "bg-card border border-border shadow-sm"
      }`}
      style={!isInTransit ? { borderLeftWidth: 4, borderLeftColor: isUrgentDeadline ? "#F59E0B" : borderColor } : undefined}
    >
      {/* Active task banner */}
      {isInTransit && mode === "idle" && (
        <div className="bg-brand/10 border-b border-brand/20 px-3.5 py-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
          <span className="text-xs font-bold text-brand uppercase tracking-wide">Active Task</span>
        </div>
      )}

      {/* Issue banner — card returned to queue with missing items */}
      {missingCount > 0 && !isInTransit && request.status !== "delivered" && request.status !== "problem" && (
        <div className="bg-amber-500 text-white px-3.5 py-1.5 flex items-center gap-1.5 text-xs font-bold">
          <AlertCircle size={12} />
          ISSUE — {missingCount} item(s) missing
        </div>
      )}

      {/* Card header */}
      <div className="p-3.5 pb-2">
        {/* Row 1: Lot number + requester name */}
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: urgencyColor }}
          />
          <span className="font-bold text-text text-[17px] truncate flex-1">
            {lotNumber ? `Lot ${lotNumber}` : "—"}
          </span>
          {request.requested_by_name && (
            <span className="text-[13px] text-text-muted shrink-0">{request.requested_by_name}</span>
          )}
        </div>

        {/* Row 2: Material name — clickable dropdown if has sub-items */}
        <div className="ml-[18px] mt-1.5">
          {hasSubItems ? (
            <button
              type="button"
              onClick={() => setItemsOpen(!itemsOpen)}
              className="flex items-center gap-1.5 text-[14px] font-medium text-text hover:text-brand transition w-full text-left"
            >
              <span className="truncate">{request.material_name}</span>
              {missingCount > 0 && (
                <span className="shrink-0 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                  {missingCount} missing
                </span>
              )}
              <ChevronDown
                size={14}
                className={`shrink-0 text-text-muted transition-transform ${itemsOpen ? "rotate-180" : ""}`}
              />
            </button>
          ) : (
            <span className="text-[14px] font-medium text-text">
              {request.material_name}
            </span>
          )}
        </div>

        {/* Sub-items dropdown */}
        {hasSubItems && itemsOpen && (
          <div className={`ml-[18px] mt-2 space-y-1 ${isInTransit ? "p-2 bg-white/60 rounded-lg border border-brand/10" : ""}`}>
            {isInTransit && (
              <p className="text-[11px] text-text-muted font-medium mb-1 px-1">Tap to mark missing items:</p>
            )}
            {request.sub_items!.map((item, idx) => {
              const isMissing = item.status === "missing";
              const canToggle = mode === "idle" && request.status !== "delivered" && request.status !== "problem";
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!canToggle}
                  onClick={() => canToggle && toggleSubItemMissing(idx)}
                  className={`w-full flex items-center gap-2 rounded-lg text-[13px] transition text-left ${
                    canToggle ? "active:scale-[0.98] cursor-pointer" : "cursor-default"
                  } ${
                    isMissing
                      ? isInTransit
                        ? "bg-amber-100 border border-amber-300 px-2.5 py-2"
                        : "bg-amber-50 border border-amber-200 px-2.5 py-1.5"
                      : isInTransit
                        ? "bg-white border border-border hover:border-brand/30 px-2.5 py-2"
                        : "bg-gray-50 border border-transparent px-2.5 py-1.5"
                  }`}
                >
                  <span className={`flex-1 ${isMissing ? "text-amber-700 font-medium" : "text-text-secondary"}`}>
                    {item.name}
                  </span>
                  {isMissing ? (
                    <span className="text-[11px] text-amber-600 font-medium flex items-center gap-0.5 bg-amber-200/60 px-1.5 py-0.5 rounded-full">
                      <AlertCircle size={10} />
                      Missing
                    </span>
                  ) : canToggle ? (
                    <span className="text-[11px] text-text-muted">
                      {isInTransit ? "✓ OK" : ""}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}

        {/* Notes */}
        {(request.notes || request.urgency_reason) && (
          <p className="text-[13px] text-text-secondary italic ml-[18px] mt-1 line-clamp-2">
            {request.notes || request.urgency_reason}
          </p>
        )}
      </div>

      {/* ─── DEADLINE BAR ─── */}
      <div className="px-3.5">
        <DeadlineBar requestedAt={request.requested_at} urgency={request.urgency_level} status={request.status} />
      </div>

      {/* ─── STEPPER ─── */}
      {mode === "idle" && (
        <div className="px-3.5 pb-3.5 pt-1">
          <StatusStepper
            status={request.status}
            timestamps={{
              requested_at: request.requested_at,
              in_transit_at: request.in_transit_at,
              delivered_at: request.delivered_at,
            }}
            interactive
            onStepClick={handleStepClick}
            showProblemButton={request.status !== "problem"}
            onProblemClick={() => setMode("problem")}
            disabled={disabled}
            transitDisabled={hasActiveTransit}
          />
        </div>
      )}

      {/* ─── PROBLEM RESOLVED ─── */}
      {mode === "idle" && request.status === "problem" && (
        <div className="px-3.5 pb-3.5">
          <button
            onClick={handleResolve}
            disabled={actionLoading !== null}
            className="w-full flex items-center justify-center gap-1.5 bg-brand text-white font-medium py-2.5 px-3 rounded-lg text-sm hover:bg-brand-dark active:scale-[0.98] transition disabled:opacity-50"
          >
            {actionLoading === "resolve" ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <RotateCcw size={16} />
                Problem Resolved — Back to Queue
              </>
            )}
          </button>
        </div>
      )}

      {/* ─── DELIVERY CONFIRMATION ─── */}
      {mode === "deliver" && (
        <div className="px-3.5 pb-3 space-y-3 border-t border-border pt-3">
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoChange}
          />

          {photoPreview ? (
            <div className="relative rounded-lg overflow-hidden">
              <img src={photoPreview} alt="Delivery" className="w-full h-40 object-cover" />
              <div className="flex items-center gap-2 p-2 bg-gray-50">
                <span className="text-xs text-green-600 font-medium flex items-center gap-1 flex-1">
                  <CheckCircle size={14} /> Photo ready
                </span>
                <button
                  onClick={() => cameraRef.current?.click()}
                  className="text-xs text-text-secondary bg-gray-100 px-2 py-1 rounded cursor-pointer hover:bg-gray-200"
                >
                  Retake
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => cameraRef.current?.click()}
              className="w-full flex flex-col items-center gap-2 py-5 border-2 border-dashed border-border rounded-lg hover:border-brand/40 hover:bg-brand/5 transition"
            >
              <Camera size={28} className="text-brand" />
              <span className="text-sm font-medium text-brand">Take Photo</span>
              <span className="text-xs text-text-muted">Optional</span>
            </button>
          )}

          <textarea
            value={deliveryNotes}
            onChange={(e) => setDeliveryNotes(e.target.value)}
            placeholder="Delivery notes (optional)"
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm text-text outline-none focus:ring-2 focus:ring-brand/30 resize-none"
          />

          <div className="flex gap-2">
            <button
              onClick={resetMode}
              className="px-4 py-2.5 text-sm text-text-secondary bg-white border border-border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelivered}
              disabled={actionLoading !== null || uploading}
              className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white font-medium py-2.5 px-3 rounded-lg text-sm hover:bg-green-700 active:scale-[0.98] transition disabled:opacity-50"
            >
              {actionLoading === "deliver" ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle size={16} />
                  Confirm Delivery
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ─── PROBLEM REPORT ─── */}
      {mode === "problem" && (
        <div className="px-3.5 pb-3 space-y-3 border-t border-border pt-3">
          <p className="text-sm font-medium text-text">What happened?</p>
          <div className="grid grid-cols-2 gap-2">
            {PROBLEM_REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setSelectedProblem(r.value)}
                className={`px-3 py-2.5 rounded-xl border text-sm font-medium text-left transition active:scale-[0.97] ${
                  selectedProblem === r.value
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-border bg-bg text-text hover:border-red-300"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {selectedProblem && (
            <textarea
              value={problemNotes}
              onChange={(e) => setProblemNotes(e.target.value)}
              placeholder="Additional details (optional)"
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm text-text outline-none focus:ring-2 focus:ring-red-200 resize-none"
            />
          )}

          <div className="flex gap-2">
            <button
              onClick={resetMode}
              className="px-4 py-2.5 text-sm text-text-secondary bg-white border border-border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleProblem}
              disabled={!selectedProblem || actionLoading !== null}
              className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 text-white font-medium py-2.5 px-3 rounded-lg text-sm hover:bg-red-700 active:scale-[0.98] transition disabled:opacity-50"
            >
              {actionLoading === "problem" ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <AlertTriangle size={16} />
                  Report Problem
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
