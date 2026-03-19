"use client";

import { formatDistanceToNow } from "date-fns";
import { StatusStepper } from "./StatusStepper";

interface MaterialRequest {
  id: string;
  material_name: string;
  quantity: number;
  unit: string;
  status: string;
  urgency_level: string;
  requested_at: string;
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

export function RequestCard({ request }: { request: MaterialRequest }) {
  const lotNumber = request.lot?.lot_number ?? null;
  const borderColor = STATUS_BORDER[request.status] || "#D1D5DB";
  const urgencyColor = URGENCY_COLORS[request.urgency_level] || "#9CA3AF";
  const timeAgo = formatDistanceToNow(new Date(request.requested_at), { addSuffix: true });

  return (
    <div
      className="bg-card rounded-xl border border-border overflow-hidden shadow-sm"
      style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}
    >
      <div className="p-3.5">
        {/* Row 1: urgency dot + material + quantity + lot badge */}
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

        {/* Row 2: meta */}
        <p className="text-[13px] text-text-secondary ml-[18px] truncate">
          {request.requested_by_name || "Worker"}
          {" \u00b7 "}
          {timeAgo}
        </p>

        {/* Notes */}
        {(request.notes || request.urgency_reason) && (
          <p className="text-[13px] text-text-secondary italic ml-[18px] mt-1.5 line-clamp-2">
            {request.notes || request.urgency_reason}
          </p>
        )}

        {/* Stepper (read-only) */}
        <div className="mt-3">
          <StatusStepper status={request.status} />
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
