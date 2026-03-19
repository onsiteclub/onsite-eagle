"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Truck, CheckCircle, Camera } from "lucide-react";

interface MaterialRequest {
  id: string;
  material_name: string;
  quantity: number;
  unit: string;
  status: string;
  urgency_level: string;
  requested_at: string;
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
};

const URGENCY_COLORS: Record<string, string> = {
  critical: "#DC2626",
  high: "#F59E0B",
  medium: "#C58B1B",
  low: "#9CA3AF",
};

export function QueueCard({
  request,
  operatorName,
  onUpdate,
}: {
  request: MaterialRequest;
  operatorName: string;
  onUpdate: () => void;
}) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const lotNumber = request.lot?.lot_number ?? null;
  const siteName = request.jobsite?.name ?? "";
  const borderColor = STATUS_BORDER[request.status] || "#D1D5DB";
  const urgencyColor = URGENCY_COLORS[request.urgency_level] || "#9CA3AF";
  const timeAgo = formatDistanceToNow(new Date(request.requested_at), { addSuffix: true });
  const isPending = request.status === "requested" || request.status === "acknowledged";

  async function updateStatus(status: string, extra?: Record<string, string>) {
    const key = status === "in_transit" ? "transit" : "deliver";
    setActionLoading(key);

    await fetch("/api/requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: request.id,
        status,
        delivered_by_name: operatorName,
        ...extra,
      }),
    });

    setActionLoading(null);
    setExpanded(false);
    setPhotoFile(null);
    setPhotoPreview(null);
    onUpdate();
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleDelivered() {
    setActionLoading("deliver");
    setUploading(true);

    let photoUrl: string | undefined;

    // Upload photo if taken
    if (photoFile) {
      const formData = new FormData();
      formData.append("file", photoFile);
      formData.append("request_id", request.id);

      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (uploadRes.ok) {
        const data = await uploadRes.json();
        photoUrl = data.url;
      }
    }

    setUploading(false);

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
    setExpanded(false);
    setPhotoFile(null);
    setPhotoPreview(null);
    setDeliveryNotes("");
    onUpdate();
  }

  return (
    <div
      className="bg-card rounded-xl border border-border overflow-hidden shadow-sm"
      style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}
    >
      {/* Card content */}
      <div className="p-3.5 pb-2">
        {/* Row 1: urgency dot + material name + quantity + lot badge */}
        <div className="flex items-center gap-2 mb-1">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: urgencyColor }}
          />
          <span className="font-semibold text-text text-[15px] truncate flex-1">
            {request.material_name}
            {request.quantity ? ` x${request.quantity}` : ""}
          </span>
          {lotNumber && (
            <span className="text-xs font-medium text-text-secondary bg-gray-100 px-2 py-0.5 rounded shrink-0">
              Lot {lotNumber}
            </span>
          )}
        </div>

        {/* Row 2: meta line */}
        <p className="text-[13px] text-text-secondary ml-[18px] truncate">
          {siteName || "Site"}
          {request.requested_by_name ? ` \u00b7 ${request.requested_by_name}` : ""}
          {" \u00b7 "}
          {timeAgo}
        </p>

        {/* Notes / urgency reason */}
        {(request.notes || request.urgency_reason) && (
          <p className="text-[13px] text-text-secondary italic ml-[18px] mt-1 line-clamp-2">
            {request.notes || request.urgency_reason}
          </p>
        )}
      </div>

      {/* Delivery confirmation (expanded) */}
      {expanded && (
        <div className="px-3.5 pb-3 space-y-3 border-t border-border pt-3">
          {/* Photo capture */}
          {photoPreview ? (
            <div className="relative rounded-lg overflow-hidden">
              <img src={photoPreview} alt="Delivery" className="w-full h-40 object-cover" />
              <div className="flex items-center gap-2 p-2 bg-gray-50">
                <span className="text-xs text-green-600 font-medium flex items-center gap-1 flex-1">
                  <CheckCircle size={14} /> Photo ready
                </span>
                <label className="text-xs text-text-secondary bg-gray-100 px-2 py-1 rounded cursor-pointer hover:bg-gray-200">
                  Retake
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                </label>
                <button
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                  className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded hover:bg-red-100"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center gap-2 py-5 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-brand/40 hover:bg-brand/5 transition">
              <Camera size={28} className="text-brand" />
              <span className="text-sm font-medium text-brand">Take Photo</span>
              <span className="text-xs text-text-muted">Document the delivery</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </label>
          )}

          {/* Notes */}
          <textarea
            value={deliveryNotes}
            onChange={(e) => setDeliveryNotes(e.target.value)}
            placeholder="Delivery notes (optional)"
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm text-text outline-none focus:ring-2 focus:ring-brand/30 resize-none"
          />

          {/* Confirm / Cancel */}
          <div className="flex gap-2">
            <button
              onClick={() => { setExpanded(false); setPhotoFile(null); setPhotoPreview(null); setDeliveryNotes(""); }}
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

      {/* Action buttons (collapsed) */}
      {!expanded && (
        <div className="flex gap-2 px-3.5 pb-3.5 pt-2">
          {isPending && (
            <button
              onClick={() => updateStatus("in_transit")}
              disabled={actionLoading !== null}
              className="flex-1 flex items-center justify-center gap-1.5 bg-brand text-white font-medium py-2.5 px-3 rounded-lg text-sm hover:bg-brand-dark active:scale-[0.98] transition disabled:opacity-50"
            >
              {actionLoading === "transit" ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Truck size={16} />
                  In Transit
                </>
              )}
            </button>
          )}

          <button
            onClick={() => setExpanded(true)}
            disabled={actionLoading !== null}
            className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white font-medium py-2.5 px-3 rounded-lg text-sm hover:bg-green-700 active:scale-[0.98] transition disabled:opacity-50"
          >
            <CheckCircle size={16} />
            Delivered
          </button>
        </div>
      )}
    </div>
  );
}
