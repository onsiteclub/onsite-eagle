"use client";

import { useState } from "react";
import { X, Package, Pencil, Check } from "lucide-react";

interface Lot {
  id: string;
  lot_number: string;
  jobsite?: { name: string } | null;
}

// 7 pre-defined bundles (factory packages)
const PHASE_BUNDLES = [
  { value: "First Floor System", label: "First Floor System", icon: "📦" },
  { value: "Main Floor Walls", label: "Main Floor Walls", icon: "🧱" },
  { value: "Second Floor System", label: "Second Floor System", icon: "📦" },
  { value: "Second Floor Walls", label: "Second Floor Walls", icon: "🧱" },
  { value: "Roof Material", label: "Roof Material", icon: "🏠" },
  { value: "Backframing", label: "Backframing", icon: "📐" },
  { value: "Strapping", label: "Strapping", icon: "🔗" },
];

// Sub-items per bundle
const BUNDLE_SUB_ITEMS: Record<string, string[]> = {
  "First Floor System": ["Plywood Sheets", "Joists", "LVLs", "Posts (Metal)", "Hangers"],
  "Main Floor Walls": ["Lumber", "Plywood Sheets", "Tyvek", "Hangers"],
  "Second Floor System": ["Plywood Sheets", "Joists", "LVLs", "Hangers"],
  "Second Floor Walls": ["Lumber", "Plywood Sheets", "Tyvek"],
  "Roof Material": ["Trusses", "Lumber", "Plywood"],
  "Backframing": ["Lumber", "Garage Jam"],
  "Strapping": ["Lumber"],
};

// Sentinel for 8th card — loose item (single piece from lumberyard)
const LOOSE = "__loose__";

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
  const [looseText, setLooseText] = useState("");
  const [selectedLotId, setSelectedLotId] = useState(
    fixedLotId ?? (lots?.length === 1 ? lots[0].id : "")
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [otherItem, setOtherItem] = useState("");

  const effectiveLotId = fixedLotId ?? selectedLotId;
  const isBundle = PHASE_BUNDLES.some((b) => b.value === selected);
  const isLoose = selected === LOOSE;
  const subItems = isBundle && selected ? BUNDLE_SUB_ITEMS[selected] ?? [] : [];
  const hasSubItems = subItems.length > 0;

  // What gets saved as material_name
  const materialName = isBundle
    ? selected
    : isLoose
    ? looseText.trim() || null
    : null;

  const canSubmit = !!effectiveLotId && (
    isBundle
      ? !!selected && (checkedItems.size > 0 || otherItem.trim().length > 0)
      : isLoose
      ? !!looseText.trim()
      : false
  );

  function selectBundle(value: string) {
    setSelected(value);
    setLooseText("");
    const items = BUNDLE_SUB_ITEMS[value] ?? [];
    setCheckedItems(new Set(items));
    setOtherItem("");
  }

  function selectLoose() {
    setSelected(LOOSE);
    setCheckedItems(new Set());
    setOtherItem("");
  }

  function toggleItem(item: string) {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }

  function toggleAll() {
    if (checkedItems.size === subItems.length) {
      setCheckedItems(new Set());
    } else {
      setCheckedItems(new Set(subItems));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError("");

    // Build sub_items array for bundles
    let subItemsPayload: { name: string; status: string }[] | null = null;
    if (isBundle && hasSubItems) {
      subItemsPayload = [];
      for (const item of subItems) {
        if (checkedItems.has(item)) {
          subItemsPayload.push({ name: item, status: "pending" });
        }
      }
      if (otherItem.trim()) {
        subItemsPayload.push({ name: otherItem.trim(), status: "pending" });
      }
    }

    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        material_name: materialName,
        quantity: 1,
        unit: isBundle ? "bundle" : "pcs",
        lot_id: effectiveLotId,
        urgency_level: "medium",
        notes: null,
        requested_by_name: userName,
        sub_items: subItemsPayload,
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

          {/* ─── 8 CARDS: 7 bundles + Loose Items ─── */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-text mb-2">
              <Package size={14} />
              What do you need?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PHASE_BUNDLES.map((b) => (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => selectBundle(b.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left text-sm font-medium transition active:scale-[0.97] ${
                    selected === b.value
                      ? "border-brand bg-brand/5 text-brand"
                      : "border-border bg-bg text-text hover:border-brand/40"
                  }`}
                >
                  <span className="text-base">{b.icon}</span>
                  <span className="truncate">{b.label}</span>
                </button>
              ))}
              {/* 8th card — Loose Items */}
              <button
                type="button"
                onClick={selectLoose}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left text-sm font-medium transition active:scale-[0.97] ${
                  isLoose
                    ? "border-brand bg-brand/5 text-brand"
                    : "border-border bg-bg text-text hover:border-brand/40"
                }`}
              >
                <span className="text-base">📋</span>
                <span className="truncate">Loose Items</span>
              </button>
            </div>
          </div>

          {/* ─── SUB-ITEMS CHECKLIST (bundles) ─── */}
          {isBundle && hasSubItems && (
            <div className="bg-gray-50 border border-border rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text">Items needed</span>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs text-brand font-medium hover:underline"
                >
                  {checkedItems.size === subItems.length ? "Unselect all" : "Select all"}
                </button>
              </div>
              <div className="space-y-1">
                {subItems.map((item) => (
                  <label
                    key={item}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition ${
                      checkedItems.has(item)
                        ? "bg-brand/10 border border-brand/20"
                        : "bg-white border border-border hover:border-brand/30"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition ${
                        checkedItems.has(item)
                          ? "bg-brand text-white"
                          : "border-2 border-gray-300"
                      }`}
                    >
                      {checkedItems.has(item) && <Check size={12} strokeWidth={3} />}
                    </div>
                    <span className="text-sm text-text">{item}</span>
                    <input
                      type="checkbox"
                      checked={checkedItems.has(item)}
                      onChange={() => toggleItem(item)}
                      className="sr-only"
                    />
                  </label>
                ))}
                {/* Other sub-item — free text */}
                <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition ${
                  otherItem.trim() ? "bg-brand/10 border-brand/20" : "bg-white border-border"
                }`}>
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition ${
                      otherItem.trim() ? "bg-brand text-white" : "border-2 border-gray-300"
                    }`}
                  >
                    {otherItem.trim() && <Check size={12} strokeWidth={3} />}
                  </div>
                  <input
                    type="text"
                    value={otherItem}
                    onChange={(e) => setOtherItem(e.target.value)}
                    placeholder="Other (specify)..."
                    className="flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ─── LOOSE ITEM TEXT INPUT ─── */}
          {isLoose && (
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-text mb-2">
                <Pencil size={14} />
                What do you need?
              </label>
              <input
                type="text"
                autoFocus
                autoCapitalize="words"
                value={looseText}
                onChange={(e) => setLooseText(e.target.value)}
                className="w-full px-3 py-3 rounded-xl border border-border bg-bg text-text text-base outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                placeholder="e.g. 1 plywood sheet, 3 studs 2x4..."
              />
            </div>
          )}

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
