"use client";

import { useState } from "react";
import { X, Package, Layers } from "lucide-react";

interface Lot {
  id: string;
  lot_number: string;
  jobsite?: { name: string } | null;
}

// Phase bundles — arrive as closed packages
const PHASE_BUNDLES = [
  { value: "1st Floor Material", label: "1st Floor Material", icon: "📦" },
  { value: "1st Floor Walls Material", label: "1st Floor Walls", icon: "🧱" },
  { value: "2nd Floor Material", label: "2nd Floor Material", icon: "📦" },
  { value: "2nd Floor Walls Material", label: "2nd Floor Walls", icon: "🧱" },
  { value: "Roof Material", label: "Roof Material", icon: "🏠" },
  { value: "Backing Material", label: "Backing Material", icon: "📐" },
  { value: "Finish Basement Material", label: "Finish Basement", icon: "🏗️" },
  { value: "Strapping", label: "Strapping", icon: "🔗" },
];

// Common loose items
const LOOSE_ITEMS = [
  { value: "2x10 Scaffold", label: "2x10 (Scaffold)" },
  { value: "2x6 Long", label: "2x6 (Long)" },
  { value: "2x4 Long", label: "2x4 (Long)" },
];

const URGENCY = [
  { value: "low", label: "Low — 24h+" },
  { value: "medium", label: "Normal — Today" },
  { value: "high", label: "High — Within hours" },
  { value: "critical", label: "Urgent — Blocking work" },
];

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

  const [selected, setSelected] = useState<string | null>(null);
  const [customMaterial, setCustomMaterial] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [selectedLotId, setSelectedLotId] = useState(
    fixedLotId ?? (lots?.length === 1 ? lots[0].id : "")
  );
  const [urgency, setUrgency] = useState("medium");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const effectiveLotId = fixedLotId ?? selectedLotId;
  const materialName = showCustom ? customMaterial.trim() : selected;
  const isBundle = PHASE_BUNDLES.some((b) => b.value === selected);
  const canSubmit = !!materialName && !!quantity && !!effectiveLotId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError("");

    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        material_name: materialName,
        quantity: parseInt(quantity),
        unit: isBundle ? "bundle" : "pcs",
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

  function selectItem(value: string) {
    setSelected(value);
    setShowCustom(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90dvh] overflow-y-auto safe-bottom">
        <div className="sticky top-0 bg-card flex items-center justify-between p-4 border-b border-border rounded-t-2xl z-10">
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

          {/* Phase Bundles */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-text mb-2">
              <Package size={14} />
              Phase Bundle
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PHASE_BUNDLES.map((b) => (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => selectItem(b.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left text-sm font-medium transition active:scale-[0.97] ${
                    selected === b.value && !showCustom
                      ? "border-brand bg-brand/5 text-brand"
                      : "border-border bg-bg text-text hover:border-brand/40"
                  }`}
                >
                  <span className="text-base">{b.icon}</span>
                  <span className="truncate">{b.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Loose Items */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-text mb-2">
              <Layers size={14} />
              Loose Items
            </label>
            <div className="flex flex-wrap gap-2">
              {LOOSE_ITEMS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => selectItem(item.value)}
                  className={`px-3 py-2 rounded-xl border text-sm font-medium transition active:scale-[0.97] ${
                    selected === item.value && !showCustom
                      ? "border-brand bg-brand/5 text-brand"
                      : "border-border bg-bg text-text hover:border-brand/40"
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => { setShowCustom(true); setSelected(null); }}
                className={`px-3 py-2 rounded-xl border text-sm font-medium transition active:scale-[0.97] ${
                  showCustom
                    ? "border-brand bg-brand/5 text-brand"
                    : "border-border bg-bg text-text-secondary hover:border-brand/40"
                }`}
              >
                Other...
              </button>
            </div>
          </div>

          {/* Custom material input */}
          {showCustom && (
            <input
              type="text"
              autoFocus
              autoCapitalize="words"
              value={customMaterial}
              onChange={(e) => setCustomMaterial(e.target.value)}
              className="w-full px-3 py-3 rounded-xl border border-border bg-bg text-text text-base outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              placeholder="Material name..."
            />
          )}

          {/* Quantity + Urgency row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Quantity</label>
              <input
                type="number"
                required
                min={1}
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-3 rounded-xl border border-border bg-bg text-text text-base outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>
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

          {/* Notes */}
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
            disabled={loading || !canSubmit}
            className="w-full bg-brand text-white font-medium py-3 px-4 rounded-xl hover:bg-brand-dark active:scale-[0.98] transition disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            ) : (
              `Request ${materialName || "..."}`
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
