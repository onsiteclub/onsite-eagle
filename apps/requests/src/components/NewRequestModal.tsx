"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface Lot {
  id: string;
  lot_number: string;
  jobsite?: { name: string } | null;
}

const UNITS = [
  { value: "pcs", label: "Pieces" },
  { value: "boards", label: "Boards" },
  { value: "sheets", label: "Sheets" },
  { value: "bundles", label: "Bundles" },
  { value: "bags", label: "Bags" },
  { value: "rolls", label: "Rolls" },
];

const URGENCY = [
  { value: "low", label: "Low — 24h+" },
  { value: "medium", label: "Normal — Today" },
  { value: "high", label: "High — Within hours" },
  { value: "critical", label: "Urgent — Blocking work" },
];

// Two modes: fixed lot (from URL) or lot picker (legacy)
type Props = {
  userName: string;
  onClose: () => void;
  onCreated: () => void;
} & (
  | { lotId: string; lotLabel: string; lots?: never }
  | { lots: Lot[]; lotId?: never; lotLabel?: never }
);

export function NewRequestModal(props: Props) {
  const { userName, onClose, onCreated } = props;
  const fixedLotId = "lotId" in props ? props.lotId : undefined;
  const fixedLotLabel = "lotLabel" in props ? props.lotLabel : undefined;
  const lots = "lots" in props ? props.lots : undefined;

  const [material, setMaterial] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [selectedLotId, setSelectedLotId] = useState(
    fixedLotId ?? (lots?.length === 1 ? lots[0].id : "")
  );
  const [urgency, setUrgency] = useState("medium");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const effectiveLotId = fixedLotId ?? selectedLotId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!material.trim() || !quantity || !effectiveLotId) return;

    setLoading(true);
    setError("");

    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        material_name: material.trim(),
        quantity: parseInt(quantity),
        unit,
        lot_id: effectiveLotId,
        urgency_level: urgency,
        notes: notes.trim() || null,
        requested_by_name: userName,
      }),
    });

    if (!res.ok) {
      setError("Failed to submit request. Please try again.");
      setLoading(false);
      return;
    }

    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90dvh] overflow-y-auto safe-bottom">
        <div className="sticky top-0 bg-card flex items-center justify-between p-4 border-b border-border rounded-t-2xl">
          <h2 className="text-lg font-semibold text-text">New Request</h2>
          <button onClick={onClose} className="p-1 text-text-secondary hover:text-text">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Fixed lot badge */}
          {fixedLotLabel && (
            <div className="bg-brand/5 border border-brand/20 rounded-xl px-3 py-2 text-sm text-brand font-medium">
              {fixedLotLabel}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text mb-1">Material *</label>
            <input
              type="text"
              required
              autoFocus
              autoCapitalize="words"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              className="w-full px-3 py-3 rounded-xl border border-border bg-bg text-text text-base outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              placeholder="Ex: 2x10 LVL Beam"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Quantity *</label>
              <input
                type="number"
                required
                min={1}
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-3 rounded-xl border border-border bg-bg text-text text-base outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                placeholder="10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-3 rounded-xl border border-border bg-bg text-text text-base outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              >
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Lot picker — only for legacy mode */}
          {lots && !fixedLotId && (
            <div>
              <label className="block text-sm font-medium text-text mb-1">Lot *</label>
              <select
                required
                value={selectedLotId}
                onChange={(e) => setSelectedLotId(e.target.value)}
                className="w-full px-3 py-3 rounded-xl border border-border bg-bg text-text text-base outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              >
                <option value="">Select lot</option>
                {lots.map((lot) => (
                  <option key={lot.id} value={lot.id}>
                    Lot {lot.lot_number} {lot.jobsite ? `— ${lot.jobsite.name}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text mb-1">Urgency</label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              className="w-full px-3 py-3 rounded-xl border border-border bg-bg text-text text-base outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            >
              {URGENCY.map((u) => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-3 rounded-xl border border-border bg-bg text-text text-base outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none"
              placeholder="Additional details..."
            />
          </div>

          {error && (
            <div className="text-sm text-error bg-red-50 px-3 py-2 rounded-lg">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || !material.trim() || !quantity || !effectiveLotId}
            className="w-full bg-brand text-white font-medium py-3 px-4 rounded-xl hover:bg-brand-dark active:scale-[0.98] transition disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            ) : (
              "Submit Request"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
