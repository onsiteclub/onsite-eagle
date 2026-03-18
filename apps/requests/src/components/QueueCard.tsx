"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { StatusBadge, UrgencyBadge } from "./StatusBadge";
import { Package, Truck, CheckCircle } from "lucide-react";

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
  const [showDeliveryNotes, setShowDeliveryNotes] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState("");

  const lotNumber = request.lot?.lot_number ?? "—";
  const siteName = request.jobsite?.name ?? "";
  const timeAgo = formatDistanceToNow(new Date(request.requested_at), {
    addSuffix: true,
    locale: ptBR,
  });

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
    setShowDeliveryNotes(false);
    onUpdate();
  }

  const urgencyBorder =
    request.urgency_level === "critical"
      ? "border-l-4 border-l-critical"
      : request.urgency_level === "high"
        ? "border-l-4 border-l-orange-400"
        : "";

  return (
    <div className={`bg-card rounded-xl border border-border p-4 space-y-3 ${urgencyBorder}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Package size={16} className="text-brand shrink-0" />
          <span className="font-semibold text-text truncate">{request.material_name}</span>
          <span className="text-sm text-text-secondary">x{request.quantity}</span>
        </div>
        <span className="text-sm font-medium text-text-secondary shrink-0">Lot {lotNumber}</span>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2 text-sm text-text-secondary flex-wrap">
        {siteName && <span>{siteName}</span>}
        {request.requested_by_name && (
          <>
            <span className="text-text-muted">&middot;</span>
            <span>{request.requested_by_name}</span>
          </>
        )}
        <span className="text-text-muted">&middot;</span>
        <span className="text-text-muted">{timeAgo}</span>
        <span className="text-text-muted">&middot;</span>
        <StatusBadge status={request.status} />
        <UrgencyBadge urgency={request.urgency_level} />
      </div>

      {(request.notes || request.urgency_reason) && (
        <p className="text-sm text-text-secondary italic">{request.notes || request.urgency_reason}</p>
      )}

      {/* Delivery notes input */}
      {showDeliveryNotes && (
        <textarea
          value={deliveryNotes}
          onChange={(e) => setDeliveryNotes(e.target.value)}
          placeholder="Notas da entrega (opcional)"
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm text-text outline-none focus:ring-2 focus:ring-brand/30 resize-none"
        />
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {(request.status === "requested" || request.status === "acknowledged") && (
          <button
            onClick={() => updateStatus("in_transit")}
            disabled={actionLoading !== null}
            className="flex-1 flex items-center justify-center gap-1.5 bg-cyan-50 text-cyan-700 font-medium py-2.5 px-3 rounded-xl text-sm hover:bg-cyan-100 active:scale-[0.98] transition disabled:opacity-50"
          >
            {actionLoading === "transit" ? (
              <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-600 rounded-full animate-spin" />
            ) : (
              <>
                <Truck size={16} />
                Em Trânsito
              </>
            )}
          </button>
        )}

        {request.status === "in_transit" && !showDeliveryNotes && (
          <button
            onClick={() => setShowDeliveryNotes(true)}
            className="flex-1 flex items-center justify-center gap-1.5 bg-green-50 text-green-700 font-medium py-2.5 px-3 rounded-xl text-sm hover:bg-green-100 active:scale-[0.98] transition"
          >
            <CheckCircle size={16} />
            Entregue
          </button>
        )}

        {showDeliveryNotes && (
          <>
            <button
              onClick={() => setShowDeliveryNotes(false)}
              className="px-3 py-2.5 text-sm text-text-secondary rounded-xl hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              onClick={() => updateStatus("delivered", { delivery_notes: deliveryNotes.trim() })}
              disabled={actionLoading !== null}
              className="flex-1 flex items-center justify-center gap-1.5 bg-success text-white font-medium py-2.5 px-3 rounded-xl text-sm hover:bg-green-600 active:scale-[0.98] transition disabled:opacity-50"
            >
              {actionLoading === "deliver" ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle size={16} />
                  Confirmar
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
