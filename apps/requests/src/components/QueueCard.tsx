"use client";

import { useState, useRef, useEffect } from "react";
import { CheckCircle, Camera, AlertTriangle, RotateCcw, AlertCircle, ChevronDown, Truck } from "lucide-react";
import { StatusStepper } from "./StatusStepper";
import { DeadlineBar } from "./DeadlineBadge";
import { getDeadlineInfo } from "@/lib/deadline";
import { STATUS_BORDER, URGENCY_COLORS } from "@/lib/colors";
import { showToast } from "@/lib/toast";

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

const PROBLEM_REASONS = [
  { value: "not_in_stock", label: "Not in Stock", requiresPhoto: false },
  { value: "not_safe", label: "Not Safe", requiresPhoto: true },
  { value: "not_ready", label: "Not Ready", requiresPhoto: true },
  { value: "other", label: "Other", requiresPhoto: false },
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
  onStartTransit,
  onDisabledClick,
  compact,
}: {
  request: MaterialRequest;
  operatorName: string;
  onUpdate: () => void;
  disabled?: boolean;
  hasActiveTransit?: boolean;
  onActiveChange?: (active: boolean) => void;
  /** Called when operator wants to start transit on this card (compact mode). Parent handles task switching. */
  onStartTransit?: () => void;
  /** Called when user taps a disabled card (e.g. machine down). Parent shows alert. */
  onDisabledClick?: () => void;
  /** Compact mode: small uniform card for queue list. No stepper, no sub-items, no deadline bar. */
  compact?: boolean;
}) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [mode, setMode] = useState<"idle" | "deliver" | "problem" | "resolve">("idle");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<string | null>(null);
  const [problemNotes, setProblemNotes] = useState("");
  const [resolveNotes, setResolveNotes] = useState("");
  const [itemsOpen, setItemsOpen] = useState(false);
  const [compactExpanded, setCompactExpanded] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);

  const lotNumber = request.lot?.lot_number ?? null;
  const borderColor = STATUS_BORDER[request.status] || "#D1D5DB";
  const urgencyColor = URGENCY_COLORS[request.urgency_level] || "#9CA3AF";

  const isActive = mode !== "idle";
  const dimmed = disabled && !isActive;

  const hasSubItems = request.sub_items && request.sub_items.length > 0;
  const missingCount = request.sub_items?.filter((i) => i.status === "missing").length ?? 0;
  const deliveredCount = request.sub_items?.filter((i) => i.status === "delivered").length ?? 0;
  const isPartialReturn = deliveredCount > 0 && missingCount > 0;
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
    setResolveNotes("");
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

      // For partial returns: auto-reset "missing" → "pending" so operator
      // doesn't have to manually un-toggle each item before delivering
      const patchBody: Record<string, unknown> = {
        id: request.id,
        status: "in_transit",
        delivered_by_name: operatorName,
      };
      if (isPartialReturn && request.sub_items) {
        patchBody.sub_items = request.sub_items.map((item) =>
          item.status === "missing" ? { ...item, status: "pending" } : item
        );
      }

      try {
        const res = await fetch("/api/requests", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patchBody),
        });
        if (!res.ok) throw new Error("Server error");
        onUpdate();
      } catch {
        showToast({ type: "error", message: "Failed to start delivery. Try again." });
      } finally {
        setActionLoading(null);
      }
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
      try {
        const formData = new FormData();
        formData.append("file", photoFile);
        formData.append("request_id", request.id);

        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (uploadRes.ok) {
          const data = await uploadRes.json();
          photoUrl = data.url;
        } else {
          showToast({ type: "warning", message: "Photo upload failed. Saving without photo." });
        }
      } catch {
        showToast({ type: "warning", message: "Photo upload failed. Saving without photo." });
      }
      setUploading(false);
    }

    // Build updated sub-items: pending→delivered, keep delivered as-is, keep missing as-is
    const updatedItems = request.sub_items?.map((item) => {
      if (item.status === "delivered") return item; // already delivered in previous round
      if (item.status === "missing") return item;   // still missing
      return { ...item, status: "delivered" };       // pending → delivered
    });

    const stillMissing = updatedItems?.filter((i) => i.status === "missing") ?? [];

    try {
      if (stillMissing.length > 0) {
        // Partial delivery — some items still missing, send back to queue
        const missingNames = stillMissing.map((i) => i.name);
        const notePrefix = `[Partial] Missing: ${missingNames.join(", ")}`;
        const fullNote = deliveryNotes.trim() ? `${notePrefix}. ${deliveryNotes.trim()}` : notePrefix;

        const res = await fetch("/api/requests", {
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
        if (!res.ok) throw new Error("Server error");
        showToast({ type: "warning", message: `${stillMissing.length} item(s) still missing. Back in queue.` });
      } else {
        // Full delivery — all items delivered (or no sub-items)
        const res = await fetch("/api/requests", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: request.id,
            status: "delivered",
            delivered_by_name: operatorName,
            delivery_notes: deliveryNotes.trim() || null,
            photo_url: photoUrl || null,
            ...(updatedItems && { sub_items: updatedItems }),
          }),
        });
        if (!res.ok) throw new Error("Server error");
        showToast({ type: "success", message: "Delivery confirmed!" });
      }
      resetMode();
      onUpdate();
    } catch {
      showToast({ type: "error", message: "Failed to confirm delivery. Try again." });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleProblem() {
    if (!selectedProblem) return;
    const reason = PROBLEM_REASONS.find((r) => r.value === selectedProblem);
    if (!reason) return;
    if (reason.requiresPhoto && !photoFile) return;

    setActionLoading("problem");

    // Upload photo if provided
    let photoUrl: string | undefined;
    if (photoFile) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", photoFile);
        formData.append("request_id", request.id);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (uploadRes.ok) {
          const data = await uploadRes.json();
          photoUrl = data.url;
        } else {
          showToast({ type: "warning", message: "Photo upload failed. Saving without photo." });
        }
      } catch {
        showToast({ type: "warning", message: "Photo upload failed. Saving without photo." });
      }
      setUploading(false);
    }

    const fullNote = problemNotes.trim()
      ? `${reason.label}: ${problemNotes.trim()}`
      : reason.label;

    try {
      const res = await fetch("/api/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: request.id,
          status: "problem",
          delivery_notes: fullNote,
          delivered_by_name: operatorName,
          ...(photoUrl && { photo_url: photoUrl }),
        }),
      });
      if (!res.ok) throw new Error("Server error");
      resetMode();
      onUpdate();
    } catch {
      showToast({ type: "error", message: "Failed to report problem. Try again." });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleResolveBackToTransit() {
    setActionLoading("resolve");
    const note = resolveNotes.trim()
      ? `[Resolved] ${resolveNotes.trim()}`
      : "[Resolved]";
    try {
      const res = await fetch("/api/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: request.id,
          status: "in_transit",
          delivered_by_name: operatorName,
          delivery_notes: note,
        }),
      });
      if (!res.ok) throw new Error("Server error");
      resetMode();
      onUpdate();
    } catch {
      showToast({ type: "error", message: "Failed to resolve. Try again." });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleResolveDeliverNow() {
    setActionLoading("resolve");
    const note = resolveNotes.trim()
      ? `[Resolved] ${resolveNotes.trim()}`
      : "[Resolved]";
    try {
      const res = await fetch("/api/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: request.id,
          status: "delivered",
          delivered_by_name: operatorName,
          delivery_notes: note,
        }),
      });
      if (!res.ok) throw new Error("Server error");
      showToast({ type: "success", message: "Delivery confirmed!" });
      resetMode();
      onUpdate();
    } catch {
      showToast({ type: "error", message: "Failed to deliver. Try again." });
    } finally {
      setActionLoading(null);
    }
  }

  async function toggleSubItemMissing(idx: number) {
    if (!request.sub_items) return;
    const updated = request.sub_items.map((item, i) =>
      i === idx
        ? { ...item, status: item.status === "missing" ? "pending" : "missing" }
        : item
    );
    try {
      const res = await fetch("/api/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: request.id, sub_items: updated }),
      });
      if (!res.ok) throw new Error("Server error");
      onUpdate();
    } catch {
      showToast({ type: "error", message: "Failed to update item. Try again." });
    }
  }

  // ─── COMPACT MODE: uniform small card for queue ───
  if (compact) {
    const expanded = compactExpanded;
    const setExpanded = setCompactExpanded;
    const canStartTransit = request.status !== "in_transit" && request.status !== "problem";
    return (
      <>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoChange}
      />
      <div
        className={`rounded-xl overflow-hidden transition-all ${
          request.urgency_level === "critical"
            ? "bg-red-50/50 border border-red-300"
            : isUrgentDeadline
            ? "bg-amber-50/80 border border-amber-300"
            : request.status === "problem"
            ? "bg-red-50/60 border border-red-200"
            : "bg-card border border-border"
        }`}
        style={{ borderLeftWidth: 4, borderLeftColor: request.urgency_level === "critical" ? "#DC2626" : isUrgentDeadline ? "#F59E0B" : borderColor }}
      >
        {/* Urgent banner */}
        {request.urgency_level === "critical" && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500 text-white">
            <AlertTriangle size={11} />
            <span className="text-xs font-bold uppercase tracking-wide">Urgent — Supervisor priority</span>
          </div>
        )}

        {/* Clickable summary — tap to expand/collapse */}
        <button
          type="button"
          onClick={() => { if (disabled && onDisabledClick) { onDisabledClick(); return; } setExpanded(!expanded); }}
          className="w-full text-left p-3"
        >
          <div className="flex items-start gap-2.5">
            {/* Urgency dot */}
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5"
              style={{ backgroundColor: urgencyColor }}
            />

            {/* 3-level hierarchy */}
            <div className="flex-1 min-w-0">
              {/* Level 1: Lot number — biggest */}
              <div className="flex items-center gap-2">
                <span className="font-bold text-text text-lg">
                  {lotNumber ? `Lot ${lotNumber}` : "—"}
                </span>
                {isPartialReturn && (
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                    Partial — {missingCount} left
                  </span>
                )}
                {missingCount > 0 && !isPartialReturn && (
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                    {missingCount} missing
                  </span>
                )}
                {request.status === "problem" && (
                  <span className="text-xs font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded-full">
                    Problem
                  </span>
                )}
              </div>
              {/* Level 2: Material — medium */}
              <p className="text-sm font-medium text-text-secondary truncate mt-0.5">
                {request.material_name}
              </p>
              {/* Level 3: Worker name — smallest */}
              {request.requested_by_name && (
                <p className="text-sm text-text-muted mt-0.5">
                  {request.requested_by_name}
                </p>
              )}
            </div>

            {/* Expand chevron */}
            <ChevronDown
              size={16}
              className={`shrink-0 text-text-muted mt-1 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </div>
        </button>

        {/* Expanded detail (read-only view) */}
        {expanded && (
          <div className="px-3 pb-3 space-y-2 border-t border-border/50 pt-2">
            {/* Sub-items */}
            {hasSubItems && (
              <div className="space-y-1">
                {request.sub_items!.map((item, idx) => {
                  const isMissing = item.status === "missing";
                  const isItemDelivered = item.status === "delivered";
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 rounded-lg text-sm px-3 py-2.5 min-h-[44px] ${
                        isItemDelivered
                          ? "bg-green-50 border border-green-200 opacity-60"
                          : isMissing
                          ? "bg-amber-50 border border-amber-200 text-amber-700 font-medium"
                          : "bg-gray-50 text-text-secondary"
                      }`}
                    >
                      {isItemDelivered && <CheckCircle size={12} className="text-green-600 shrink-0" />}
                      <span className={`flex-1 ${isItemDelivered ? "text-green-700 line-through" : ""}`}>{item.name}</span>
                      {isMissing && (
                        <span className="text-xs font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <AlertCircle size={9} /> Missing
                        </span>
                      )}
                      {isItemDelivered && (
                        <span className="text-xs font-medium text-green-600">Done</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Notes */}
            {(request.notes || request.urgency_reason) && (
              <p className="text-sm text-text-secondary italic line-clamp-3">
                {request.notes || request.urgency_reason}
              </p>
            )}

            {/* Deadline bar */}
            <DeadlineBar requestedAt={request.requested_at} urgency={request.urgency_level} status={request.status} />

            {/* Action buttons */}
            {mode === "idle" && (
              <div className="flex gap-2 pt-1">
                {request.status === "problem" ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); setMode("resolve"); }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-brand text-white hover:bg-brand-dark active:scale-[0.97] transition"
                  >
                    <RotateCcw size={14} />
                    Resolve
                  </button>
                ) : canStartTransit ? (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); onStartTransit?.(); }}
                      disabled={actionLoading !== null}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 active:scale-[0.97] transition disabled:opacity-50"
                    >
                      {actionLoading === "transit" ? (
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Truck size={14} />
                          Start Delivery
                        </>
                      )}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setMode("problem"); }}
                      className="flex items-center justify-center min-h-[44px] min-w-[44px] px-3 py-2 rounded-lg text-sm font-medium bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-400 active:scale-[0.97] transition"
                      aria-label="Report problem"
                    >
                      <AlertTriangle size={18} />
                    </button>
                  </>
                ) : null}
              </div>
            )}

            {/* Problem report form (compact) */}
            {mode === "problem" && (() => {
              const selectedReason = PROBLEM_REASONS.find((r) => r.value === selectedProblem);
              const needsPhoto = selectedReason?.requiresPhoto ?? false;
              return (
                <div className="space-y-2 pt-1 border-t border-border/50 mt-1">
                  <p className="text-sm font-medium text-text">What happened?</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PROBLEM_REASONS.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedProblem(r.value); setPhotoFile(null); setPhotoPreview(null); }}
                        className={`px-2.5 py-2.5 rounded-lg border text-sm font-medium text-left transition active:scale-[0.97] ${
                          selectedProblem === r.value
                            ? "border-red-500 bg-red-50 text-red-700"
                            : "border-border bg-bg text-text hover:border-red-300"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>

                  {/* Photo area — required for not_safe / not_ready */}
                  {selectedProblem && needsPhoto && (
                    <div>
                      {photoPreview ? (
                        <div className="relative rounded-lg overflow-hidden">
                          <img src={photoPreview} alt="Problem" className="w-full h-24 object-cover" />
                          <div className="flex items-center gap-2 p-1.5 bg-gray-50">
                            <span className="text-xs text-green-600 font-medium flex items-center gap-1 flex-1">
                              <CheckCircle size={11} /> Photo ready
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); cameraRef.current?.click(); }}
                              className="text-xs text-text-secondary bg-gray-100 px-1.5 py-0.5 rounded"
                            >
                              Retake
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); cameraRef.current?.click(); }}
                          className="w-full flex items-center justify-center gap-1.5 py-3 border-2 border-dashed border-red-300 rounded-lg hover:border-red-400 hover:bg-red-50/50 transition"
                        >
                          <Camera size={16} className="text-red-500" />
                          <span className="text-xs font-medium text-red-600">Take Photo (required)</span>
                        </button>
                      )}
                    </div>
                  )}

                  {selectedProblem && (
                    <textarea
                      value={problemNotes}
                      onChange={(e) => setProblemNotes(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Details (optional)"
                      rows={2}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-bg text-xs text-text outline-none focus:ring-2 focus:ring-red-200 resize-none"
                    />
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); resetMode(); }}
                      className="px-3 py-2 text-xs text-text-secondary bg-white border border-border rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleProblem(); }}
                      disabled={!selectedProblem || actionLoading !== null || uploading || (needsPhoto && !photoFile)}
                      className="flex-1 flex items-center justify-center gap-1 bg-red-600 text-white font-medium py-2 px-3 rounded-lg text-xs hover:bg-red-700 active:scale-[0.97] transition disabled:opacity-50"
                    >
                      {actionLoading === "problem" || uploading ? (
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <AlertTriangle size={12} />
                          Report Problem
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Resolve form (compact) */}
            {mode === "resolve" && (
              <div className="space-y-2 pt-1 border-t border-border/50 mt-1">
                <p className="text-sm font-medium text-text">How was it resolved?</p>
                <textarea
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="e.g. swapped item, restocked... (optional)"
                  rows={2}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-bg text-xs text-text outline-none focus:ring-2 focus:ring-brand/30 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); resetMode(); }}
                    className="px-2.5 py-2 text-xs text-text-secondary bg-white border border-border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleResolveBackToTransit(); }}
                    disabled={actionLoading !== null}
                    className="flex-1 flex items-center justify-center gap-1 bg-blue-500 text-white font-medium py-2 px-3 rounded-lg text-xs hover:bg-blue-600 active:scale-[0.97] transition disabled:opacity-50"
                  >
                    {actionLoading === "resolve" ? (
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Truck size={12} />
                        Back to Route
                      </>
                    )}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleResolveDeliverNow(); }}
                    disabled={actionLoading !== null}
                    className="flex-1 flex items-center justify-center gap-1 bg-green-600 text-white font-medium py-2 px-3 rounded-lg text-xs hover:bg-green-700 active:scale-[0.97] transition disabled:opacity-50"
                  >
                    {actionLoading === "resolve" ? (
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle size={12} />
                        Deliver Now
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      </>
    );
  }

  return (
    <div
      className={`rounded-xl overflow-hidden transition-all ${
        isInTransit
          ? request.urgency_level === "critical"
            ? "bg-red-50/40 border-2 border-red-400 ring-2 ring-red-100 shadow-lg"
            : "bg-blue-50/60 border-2 border-blue-300 ring-2 ring-blue-100 shadow-lg"
          : dimmed
          ? "bg-card border border-border opacity-40 shadow-sm"
          : isUrgentDeadline
          ? "bg-amber-50/80 border border-amber-300 shadow-sm"
          : "bg-card border border-border shadow-sm"
      }`}
      style={!isInTransit ? { borderLeftWidth: 4, borderLeftColor: isUrgentDeadline ? "#F59E0B" : borderColor } : undefined}
      onClick={disabled ? (e) => { e.stopPropagation(); onDisabledClick?.(); } : undefined}
    >
      {/* Urgent banner */}
      {request.urgency_level === "critical" && (
        <div className="bg-red-500 text-white px-3.5 py-1.5 flex items-center gap-1.5 text-xs font-bold">
          <AlertTriangle size={12} />
          URGENT — Supervisor priority
        </div>
      )}

      {/* Active task banner */}
      {isInTransit && mode === "idle" && (
        <div className="bg-brand/10 border-b border-brand/20 px-3.5 py-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
          <span className="text-xs font-bold text-brand uppercase tracking-wide">Active Task</span>
        </div>
      )}

      {/* Partial return banner — card returned to queue with some items already delivered */}
      {isPartialReturn && !isInTransit && request.status !== "delivered" && request.status !== "problem" && (
        <div className="bg-amber-500 text-white px-3.5 py-2 flex items-center gap-1.5 text-xs font-bold">
          <AlertCircle size={12} />
          <span>PARTIAL — {missingCount} item(s) still pending. Will stay in queue until complete.</span>
        </div>
      )}
      {/* Missing items banner (non-partial — e.g. worker reported missing after delivery) */}
      {missingCount > 0 && !isPartialReturn && !isInTransit && request.status !== "delivered" && request.status !== "problem" && (
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
          <span className="font-bold text-text text-lg truncate flex-1">
            {lotNumber ? `Lot ${lotNumber}` : "—"}
          </span>
          {request.requested_by_name && (
            <span className="text-sm text-text-muted shrink-0">{request.requested_by_name}</span>
          )}
        </div>

        {/* Row 2: Material name — clickable dropdown if has sub-items */}
        <div className="ml-[18px] mt-1.5">
          {hasSubItems ? (
            <button
              type="button"
              onClick={() => setItemsOpen(!itemsOpen)}
              className="flex items-center gap-1.5 text-base font-medium text-text hover:text-brand transition w-full text-left"
            >
              <span className="truncate">{request.material_name}</span>
              {missingCount > 0 && (
                <span className="shrink-0 text-xs font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                  {missingCount} missing
                </span>
              )}
              <ChevronDown
                size={14}
                className={`shrink-0 text-text-muted transition-transform ${itemsOpen ? "rotate-180" : ""}`}
              />
            </button>
          ) : (
            <span className="text-base font-medium text-text">
              {request.material_name}
            </span>
          )}
        </div>

        {/* Sub-items dropdown */}
        {hasSubItems && itemsOpen && (
          <div className={`ml-[18px] mt-2 space-y-1 ${isInTransit ? "p-2 bg-white/60 rounded-lg border border-brand/10" : ""}`}>
            {isInTransit && (
              <p className="text-xs text-text-muted font-medium mb-1 px-1">Tap to mark missing items:</p>
            )}
            {request.sub_items!.map((item, idx) => {
              const isMissing = item.status === "missing";
              const isDelivered = item.status === "delivered";
              const canToggle = !isDelivered && mode === "idle" && request.status !== "delivered" && request.status !== "problem";

              // Already-delivered items: locked, dimmed, not interactive
              if (isDelivered) {
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-lg text-sm px-3 py-2.5 min-h-[44px] bg-green-50 border border-green-200 opacity-60"
                  >
                    <CheckCircle size={14} className="text-green-600 shrink-0" />
                    <span className="flex-1 text-green-700 line-through">{item.name}</span>
                    <span className="text-xs font-medium text-green-600">Delivered</span>
                  </div>
                );
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!canToggle}
                  onClick={() => canToggle && toggleSubItemMissing(idx)}
                  className={`w-full flex items-center gap-2 rounded-lg text-sm transition text-left min-h-[44px] ${
                    canToggle ? "active:scale-[0.98] cursor-pointer" : "cursor-default"
                  } ${
                    isMissing
                      ? isInTransit
                        ? "bg-amber-100 border border-amber-300 px-3 py-2.5"
                        : "bg-amber-50 border border-amber-200 px-3 py-2.5"
                      : isInTransit
                        ? "bg-white border border-border hover:border-brand/30 px-3 py-2.5"
                        : "bg-gray-50 border border-transparent px-3 py-2.5"
                  }`}
                >
                  <span className={`flex-1 ${isMissing ? "text-amber-700 font-medium" : "text-text-secondary"}`}>
                    {item.name}
                  </span>
                  {isMissing ? (
                    <span className="text-xs text-amber-600 font-medium flex items-center gap-0.5 bg-amber-200/60 px-1.5 py-0.5 rounded-full">
                      <AlertCircle size={10} />
                      Missing
                    </span>
                  ) : canToggle ? (
                    <span className="text-xs text-text-muted">
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
          <p className="text-sm text-text-secondary italic ml-[18px] mt-1 line-clamp-2">
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

      {/* ─── PROBLEM: Open resolve mode ─── */}
      {mode === "idle" && request.status === "problem" && (
        <div className="px-3.5 pb-3.5">
          <button
            onClick={() => setMode("resolve")}
            className="w-full flex items-center justify-center gap-1.5 bg-brand text-white font-medium py-2.5 px-3 rounded-lg text-sm hover:bg-brand-dark active:scale-[0.98] transition"
          >
            <RotateCcw size={16} />
            Resolve
          </button>
        </div>
      )}

      {/* ─── RESOLVE FORM ─── */}
      {mode === "resolve" && (
        <div className="px-3.5 pb-3.5 space-y-3 border-t border-border pt-3">
          <p className="text-sm font-medium text-text">How was it resolved?</p>
          <textarea
            value={resolveNotes}
            onChange={(e) => setResolveNotes(e.target.value)}
            placeholder="e.g. swapped item, restocked... (optional)"
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm text-text outline-none focus:ring-2 focus:ring-brand/30 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={resetMode}
              className="px-3 py-2.5 text-sm text-text-secondary bg-white border border-border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleResolveBackToTransit}
              disabled={actionLoading !== null}
              className="flex-1 flex items-center justify-center gap-1.5 bg-blue-500 text-white font-medium py-2.5 px-3 rounded-lg text-sm hover:bg-blue-600 active:scale-[0.98] transition disabled:opacity-50"
            >
              {actionLoading === "resolve" ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Truck size={15} />
                  Back to Route
                </>
              )}
            </button>
            <button
              onClick={handleResolveDeliverNow}
              disabled={actionLoading !== null}
              className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white font-medium py-2.5 px-3 rounded-lg text-sm hover:bg-green-700 active:scale-[0.98] transition disabled:opacity-50"
            >
              {actionLoading === "resolve" ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle size={15} />
                  Deliver Now
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Hidden camera input — shared between deliver and problem modes */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoChange}
      />

      {/* ─── DELIVERY CONFIRMATION ─── */}
      {mode === "deliver" && (
        <div className="px-3.5 pb-3 space-y-3 border-t border-border pt-3">
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
              className={`flex-1 flex items-center justify-center gap-1.5 text-white font-medium py-2.5 px-3 rounded-lg text-sm active:scale-[0.98] transition disabled:opacity-50 ${
                missingCount > 0
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {actionLoading === "deliver" ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : missingCount > 0 ? (
                <>
                  <AlertCircle size={16} />
                  Deliver &amp; Return ({missingCount} missing)
                </>
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
      {mode === "problem" && (() => {
        const selectedReason = PROBLEM_REASONS.find((r) => r.value === selectedProblem);
        const needsPhoto = selectedReason?.requiresPhoto ?? false;
        return (
          <div className="px-3.5 pb-3 space-y-3 border-t border-border pt-3">
            <p className="text-sm font-medium text-text">What happened?</p>
            <div className="grid grid-cols-2 gap-2">
              {PROBLEM_REASONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => { setSelectedProblem(r.value); setPhotoFile(null); setPhotoPreview(null); }}
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

            {/* Photo area — required for not_safe / not_ready */}
            {selectedProblem && needsPhoto && (
              <div className="space-y-1">
                {photoPreview ? (
                  <div className="relative rounded-lg overflow-hidden">
                    <img src={photoPreview} alt="Problem" className="w-full h-32 object-cover" />
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
                    className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-red-300 rounded-lg hover:border-red-400 hover:bg-red-50/50 transition"
                  >
                    <Camera size={20} className="text-red-500" />
                    <span className="text-sm font-medium text-red-600">Take Photo (required)</span>
                  </button>
                )}
              </div>
            )}

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
                disabled={!selectedProblem || actionLoading !== null || uploading || (needsPhoto && !photoFile)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 text-white font-medium py-2.5 px-3 rounded-lg text-sm hover:bg-red-700 active:scale-[0.98] transition disabled:opacity-50"
              >
                {actionLoading === "problem" || uploading ? (
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
        );
      })()}
    </div>
  );
}
