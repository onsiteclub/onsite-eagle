"use client";

import { useState, useRef, useEffect } from "react";
import { CheckCircle, Camera, AlertTriangle, RotateCcw } from "lucide-react";
import { StatusStepper } from "./StatusStepper";
import { DeadlineBadge, DeadlineBar } from "./DeadlineBadge";

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
  lot: { lot_number: string; address: string | null } | null;
  jobsite: { name: string } | null;
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
  { value: "road_blocked", label: "Road blocked" },
  { value: "wrong_material", label: "Wrong material requested" },
  { value: "truck_full", label: "Truck full" },
  { value: "site_closed", label: "Site closed" },
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
}: {
  request: MaterialRequest;
  operatorName: string;
  onUpdate: () => void;
  disabled?: boolean;
  hasActiveTransit?: boolean;
  onActiveChange?: (active: boolean) => void;
}) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [mode, setMode] = useState<"idle" | "deliver" | "problem">("idle");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState<string | null>(null);
  const [problemNotes, setProblemNotes] = useState("");

  const cameraRef = useRef<HTMLInputElement>(null);

  const lotNumber = request.lot?.lot_number ?? null;
  const siteName = request.jobsite?.name ?? "";
  const borderColor = STATUS_BORDER[request.status] || "#D1D5DB";
  const urgencyColor = URGENCY_COLORS[request.urgency_level] || "#9CA3AF";

  const isActive = mode !== "idle";
  const dimmed = disabled && !isActive;

  useEffect(() => {
    onActiveChange?.(isActive);
  }, [isActive, onActiveChange]);

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
      // Enter delivery mode + auto-open camera
      setMode("deliver");
      setTimeout(() => cameraRef.current?.click(), 100);
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

  return (
    <div
      className={`bg-card rounded-xl border border-border overflow-hidden shadow-sm transition ${
        dimmed ? "opacity-40 pointer-events-none" : ""
      }`}
      style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}
    >
      {/* Card content */}
      <div className="p-3.5 pb-2">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: urgencyColor }}
          />
          <span className="font-bold text-text text-[17px] truncate flex-1">
            {lotNumber ? `Lot ${lotNumber}` : "—"}
          </span>
          {siteName && (
            <span className="text-xs text-text-muted shrink-0">{siteName}</span>
          )}
        </div>

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

      {/* ─── STEPPER (replaces old buttons) ─── */}
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
