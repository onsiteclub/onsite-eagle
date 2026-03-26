"use client";

import { useState } from "react";
import {
  X, Package, Pencil, Check, Box, ArrowLeft,
  Bolt, ShieldCheck, Layers, Wrench, Footprints,
  LayoutGrid, TriangleAlert, Hammer, DoorOpen, Fence,
  ClipboardList,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { showToast } from "@/lib/toast";

// Custom wall-frame icon (studs + plates + mid blocking)
function WallFrameIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="2" y1="20" x2="22" y2="20" />
      <line x1="2" y1="4" x2="22" y2="4" />
      <line x1="4" y1="4" x2="4" y2="20" />
      <line x1="9" y1="4" x2="9" y2="20" />
      <line x1="14" y1="4" x2="14" y2="20" />
      <line x1="19" y1="4" x2="19" y2="20" />
      <line x1="4" y1="12" x2="9" y2="12" />
      <line x1="14" y1="12" x2="19" y2="12" />
    </svg>
  );
}

// Custom floor joists icon (parallel joists between rim boards)
function JoistsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="3" y1="2" x2="3" y2="22" />
      <line x1="21" y1="2" x2="21" y2="22" />
      <line x1="3" y1="4" x2="21" y2="4" />
      <line x1="3" y1="8" x2="21" y2="8" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="16" x2="21" y2="16" />
      <line x1="3" y1="20" x2="21" y2="20" />
      <line x1="11" y1="4" x2="13" y2="8" />
      <line x1="13" y1="8" x2="11" y2="12" />
      <line x1="11" y1="12" x2="13" y2="16" />
      <line x1="13" y1="16" x2="11" y2="20" />
    </svg>
  );
}

// Custom backing icon (horizontal strapping on vertical studs)
function BackingIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="5" y1="2" x2="5" y2="22" />
      <line x1="12" y1="2" x2="12" y2="22" />
      <line x1="19" y1="2" x2="19" y2="22" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

// Custom roof truss icon (triangle truss with web members)
function RoofTrussIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="1" y1="18" x2="23" y2="18" />
      <line x1="1" y1="18" x2="12" y2="5" />
      <line x1="23" y1="18" x2="12" y2="5" />
      <line x1="12" y1="5" x2="12" y2="18" />
      <line x1="6.5" y1="11.5" x2="8" y2="18" />
      <line x1="6.5" y1="11.5" x2="12" y2="18" />
      <line x1="17.5" y1="11.5" x2="16" y2="18" />
      <line x1="17.5" y1="11.5" x2="12" y2="18" />
    </svg>
  );
}

function renderPhaseIcon(icon: string, className: string) {
  switch (icon) {
    case WALL_ICON: return <WallFrameIcon className={className} />;
    case ROOF_ICON: return <RoofTrussIcon className={className} />;
    case JOIST_ICON: return <JoistsIcon className={className} />;
    case BACKING_ICON: return <BackingIcon className={className} />;
    default: return <span className="text-base">{icon}</span>;
  }
}

const SUB_ITEM_ICONS: Record<string, LucideIcon> = {
  "Steel Beams / Posts": Bolt,
  "Steel Beams": Bolt,
  "Gasket / Tyvek / Poly": ShieldCheck,
  "Plating Lumber": Layers,
  "Joists": LayoutGrid,
  "Hangers / Brackets": Wrench,
  "Hangers": Wrench,
  "Temp Stair": Footprints,
  "Floor Sheathing": Layers,
  "Long Lumber": Hammer,
  "Ext. Wall Studs": Fence,
  "Wall Sheathing": Layers,
  "Int. Wall Studs": Fence,
  "Landings Package": Package,
  "Porch Package": Package,
  "Safety Package": ShieldCheck,
  "Bracing 2x4s": Hammer,
  "Trusses": TriangleAlert,
  "Truss Lumber Package": Package,
  "Truss Hangers": Wrench,
  "Truss Sheathing": Layers,
  "H-Clips": Wrench,
  "Strapping": Hammer,
  "Backing Package": Package,
  "Garage Jambs": DoorOpen,
  "Finished Basement Pack": Package,
  "Porch P.T. 2x6s": Hammer,
  "Porch Posts Brackets": Bolt,
};

interface Lot {
  id: string;
  lot_number: string;
  jobsite?: { name: string } | null;
}

interface SiblingLot {
  id: string;
  lot_number: string;
  block: string | null;
  jobsite_id: string;
  status: string;
  jobsite: { name: string } | null;
}

// 6 phases from Shabba's material catalog
const WALL_ICON = "wall" as const;
const ROOF_ICON = "roof" as const;
const JOIST_ICON = "joist" as const;
const BACKING_ICON = "backing" as const;
const PHASE_BUNDLES: { value: string; label: string; icon: string }[] = [
  { value: "1st Sub-Floor", label: "1st Sub-Floor", icon: JOIST_ICON },
  { value: "1st Walls", label: "1st Walls", icon: WALL_ICON },
  { value: "2nd Sub-Floor", label: "2nd Sub-Floor", icon: JOIST_ICON },
  { value: "2nd Walls", label: "2nd Walls", icon: WALL_ICON },
  { value: "Roofing Load", label: "Roofing Load", icon: ROOF_ICON },
  { value: "Backing", label: "Backing", icon: BACKING_ICON },
];

// Sub-items per phase (from Shabba)
const BUNDLE_SUB_ITEMS: Record<string, string[]> = {
  "1st Sub-Floor": [
    "Steel Beams / Posts",
    "Gasket / Tyvek / Poly",
    "Plating Lumber",
    "Joists",
    "Hangers / Brackets",
    "Temp Stair",
    "Floor Sheathing",
  ],
  "1st Walls": [
    "Long Lumber",
    "Ext. Wall Studs",
    "Wall Sheathing",
    "Int. Wall Studs",
    "Landings Package",
    "Porch Package",
  ],
  "2nd Sub-Floor": [
    "Steel Beams",
    "Safety Package",
    "Joists",
    "Hangers",
    "Temp Stair",
    "Floor Sheathing",
  ],
  "2nd Walls": [
    "Long Lumber",
    "Ext. Wall Studs",
    "Wall Sheathing",
    "Int. Wall Studs",
    "Bracing 2x4s",
  ],
  "Roofing Load": [
    "Safety Package",
    "Trusses",
    "Truss Lumber Package",
    "Truss Hangers",
    "Truss Sheathing",
    "H-Clips",
  ],
  "Backing": [
    "Strapping",
    "Backing Package",
    "Garage Jambs",
    "Finished Basement Pack",
    "Porch P.T. 2x6s",
    "Porch Posts Brackets",
  ],
};

const LOOSE = "__loose__";

type Props = {
  userName: string;
  onClose: () => void;
  onCreated: () => void;
  siblingLots?: SiblingLot[];
} & (
  | { lotId: string; lotLabel: string; lots?: never }
  | { lots: Lot[]; lotId?: never; lotLabel?: never }
);

// ─── Sub-items inline (step 2 content for bundles) ───
function SubItemsInline({
  phase,
  subItems,
  checkedItems,
  otherItem,
  onCheckedChange,
  onOtherChange,
}: {
  phase: string;
  subItems: string[];
  checkedItems: Set<string>;
  otherItem: string;
  onCheckedChange: (items: Set<string>) => void;
  onOtherChange: (value: string) => void;
}) {
  const [otherActive, setOtherActive] = useState(!!otherItem.trim());

  function toggle(item: string) {
    const next = new Set(checkedItems);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    onCheckedChange(next);
  }

  function toggleAll() {
    if (checkedItems.size === subItems.length) {
      onCheckedChange(new Set());
    } else {
      onCheckedChange(new Set(subItems));
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-base font-medium text-text">{phase}</span>
        <button type="button" onClick={toggleAll} className="text-sm text-brand font-medium hover:underline">
          {checkedItems.size === subItems.length ? "Unselect all" : "Select all"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 bg-gray-100/60 rounded-2xl p-3">
        {subItems.map((item, idx) => {
          const Icon = SUB_ITEM_ICONS[item] ?? Box;
          const active = checkedItems.has(item);
          const iconColor = idx % 2 === 0 ? "text-teal-600" : "text-amber-600";
          return (
            <button
              key={item}
              type="button"
              onClick={() => toggle(item)}
              className={`relative flex flex-col items-center justify-center gap-2.5 py-5 px-2 rounded-xl transition-all duration-150 cursor-pointer select-none active:scale-[0.97] ${
                active
                  ? "bg-brand/10 shadow-sm ring-2 ring-brand"
                  : "bg-white shadow-sm hover:shadow-md"
              }`}
            >
              {active && (
                <div className="absolute top-2 right-2 w-4.5 h-4.5 rounded-full bg-brand flex items-center justify-center">
                  <Check size={10} strokeWidth={3} className="text-white" />
                </div>
              )}
              <Icon size={24} strokeWidth={1.5} className={iconColor} />
              <span className={`text-sm font-medium leading-tight text-center transition-colors ${
                active ? "text-text" : "text-text-secondary"
              }`}>
                {item}
              </span>
            </button>
          );
        })}
        {/* Other (specify) card */}
        <button
          type="button"
          onClick={() => {
            if (otherActive) {
              setOtherActive(false);
              onOtherChange("");
            } else {
              setOtherActive(true);
            }
          }}
          className={`relative flex flex-col items-center justify-center gap-2.5 py-5 px-2 rounded-xl transition-all duration-150 cursor-pointer select-none active:scale-[0.97] border-2 border-dashed ${
            otherActive
              ? "bg-brand/10 shadow-sm ring-2 ring-brand border-transparent"
              : "bg-white/60 border-gray-300 hover:shadow-md hover:border-brand/40"
          }`}
        >
          {otherActive && (
            <div className="absolute top-2 right-2 w-4.5 h-4.5 rounded-full bg-brand flex items-center justify-center">
              <Check size={10} strokeWidth={3} className="text-white" />
            </div>
          )}
          <Pencil size={24} strokeWidth={1.5} className="text-violet-500" />
          <span className={`text-sm font-medium text-center transition-colors ${
            otherActive ? "text-text" : "text-text-secondary"
          }`}>
            Other
          </span>
        </button>
      </div>

      {otherActive && (
        <input
          autoFocus
          type="text"
          value={otherItem}
          onChange={(e) => onOtherChange(e.target.value)}
          placeholder="Describe what you need..."
          className="w-full px-3 py-3 rounded-xl border border-border bg-bg text-text text-base outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
        />
      )}
    </div>
  );
}

// ─── Main modal ───
export function NewRequestModal(props: Props) {
  const { userName, onClose, onCreated, siblingLots } = props;
  const fixedLotId = "lotId" in props ? props.lotId : undefined;
  const fixedLotLabel = "lotLabel" in props ? props.lotLabel : undefined;
  const lots = "lots" in props ? props.lots : undefined;

  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [looseText, setLooseText] = useState("");
  const [selectedLotId, setSelectedLotId] = useState(
    fixedLotId ?? (lots?.length === 1 ? lots[0].id : "")
  );
  const [loading, setLoading] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [otherItem, setOtherItem] = useState("");
  const [extraLotIds, setExtraLotIds] = useState<Set<string>>(
    new Set(siblingLots?.map((sl) => sl.id) ?? [])
  );

  const hasSiblings = !!siblingLots?.length;
  const effectiveLotId = fixedLotId ?? selectedLotId;
  const isBundle = PHASE_BUNDLES.some((b) => b.value === selected);
  const isLoose = selected === LOOSE;

  // Step 2 validity
  const step2Valid = isBundle
    ? (checkedItems.size > 0 || otherItem.trim().length > 0)
    : isLoose
    ? !!looseText.trim()
    : false;

  function goToStep2(selection: string) {
    if (selection !== selected) {
      setCheckedItems(new Set());
      setOtherItem("");
      setLooseText("");
    }
    setSelected(selection);
    setStep(2);
  }

  function goBack() {
    setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3);
  }

  async function handleFinalSubmit() {
    if (!effectiveLotId) return;
    setLoading(true);

    const allLotIds = [effectiveLotId, ...Array.from(extraLotIds)];

    if (isBundle && selected) {
      const subs = BUNDLE_SUB_ITEMS[selected] ?? [];
      const subItemsPayload: { name: string; status: string }[] = [];
      for (const item of subs) {
        if (checkedItems.has(item)) {
          subItemsPayload.push({ name: item, status: "pending" });
        }
      }
      if (otherItem.trim()) {
        subItemsPayload.push({ name: otherItem.trim(), status: "pending" });
      }

      try {
        const results = await Promise.all(
          allLotIds.map((lotId) =>
            fetch("/api/requests", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                material_name: selected,
                quantity: 1,
                unit: "bundle",
                lot_id: lotId,
                urgency_level: "medium",
                notes: null,
                requested_by_name: userName,
                sub_items: subItemsPayload.length > 0 ? subItemsPayload : null,
              }),
            })
          )
        );

        const failed = results.filter((r) => !r.ok).length;
        if (failed === results.length) {
          showToast({ type: "error", message: "Failed to submit request. Try again." });
          setLoading(false);
          return;
        }
        if (failed > 0) {
          showToast({ type: "warning", message: `${failed} of ${results.length} requests failed.` });
        } else {
          showToast({ type: "success", message: "Request submitted!" });
        }
        onCreated();
        onClose();
      } catch {
        showToast({ type: "error", message: "No connection. Check network." });
        setLoading(false);
      }
    } else if (isLoose) {
      try {
        const results = await Promise.all(
          allLotIds.map((lotId) =>
            fetch("/api/requests", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                material_name: looseText.trim(),
                quantity: 1,
                unit: "pcs",
                lot_id: lotId,
                urgency_level: "medium",
                notes: null,
                requested_by_name: userName,
                sub_items: null,
              }),
            })
          )
        );

        const failed = results.filter((r) => !r.ok).length;
        if (failed === results.length) {
          showToast({ type: "error", message: "Failed to submit request. Try again." });
          setLoading(false);
          return;
        }
        showToast({ type: "success", message: "Request submitted!" });
        onCreated();
        onClose();
      } catch {
        showToast({ type: "error", message: "No connection. Check network." });
        setLoading(false);
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90dvh] overflow-y-auto safe-bottom">
        {/* Header */}
        <div className="sticky top-0 bg-card flex items-center justify-between p-4 border-b border-border rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button onClick={goBack} className="p-1 -ml-1 text-text-secondary hover:text-text" aria-label="Go back">
                <ArrowLeft size={20} />
              </button>
            )}
            <h2 className="text-lg font-semibold text-text">New Request</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-muted">
              {step} <span className="text-text-muted/50">/ 2</span>
            </span>
            <button onClick={onClose} className="p-1 text-text-secondary hover:text-text" aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Step indicator dots */}
        <div className="flex items-center justify-center gap-2 pt-3 pb-1">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                s === step ? "w-6 bg-brand" : s < step ? "w-3 bg-brand/40" : "w-3 bg-gray-200"
              }`}
            />
          ))}
        </div>

        <div className="p-4 space-y-4">
          {/* Fixed lot badge — all steps */}
          {fixedLotLabel && (
            <div className="bg-brand/5 border border-brand/20 rounded-xl px-3 py-2.5 text-base text-brand font-medium">
              {fixedLotLabel}
            </div>
          )}

          {/* ═══════════ STEP 1: Select Phase ═══════════ */}
          {step === 1 && (
            <>
              {/* Sibling lots */}
              {hasSiblings && (
                <div className="bg-gray-50 border border-border rounded-xl p-3 space-y-2">
                  <p className="text-sm font-medium text-text-secondary">Also request for these lots?</p>
                  {siblingLots!.map((sl) => (
                    <label key={sl.id} className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                      <input
                        type="checkbox"
                        checked={extraLotIds.has(sl.id)}
                        onChange={() =>
                          setExtraLotIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(sl.id)) next.delete(sl.id);
                            else next.add(sl.id);
                            return next;
                          })
                        }
                        className="w-5 h-5 rounded border-border text-brand focus:ring-brand/30 accent-[var(--color-brand)]"
                      />
                      <span className="text-base text-text">Lot {sl.lot_number}</span>
                    </label>
                  ))}
                </div>
              )}

              <div>
                <label className="flex items-center gap-1.5 text-base font-medium text-text mb-2">
                  <Package size={16} />
                  What do you need?
                </label>
                <div className="flex flex-col gap-2">
                  {PHASE_BUNDLES.map((b, idx) => {
                    const iconColor = idx % 2 === 0 ? "text-teal-600" : "text-amber-600";
                    const wasSelected = selected === b.value && checkedItems.size > 0;
                    return (
                      <button
                        key={b.value}
                        type="button"
                        onClick={() => goToStep2(b.value)}
                        className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl border text-left text-base font-medium transition active:scale-[0.97] ${
                          wasSelected
                            ? "border-brand bg-brand/5 text-text"
                            : "border-border bg-bg text-text hover:border-brand/40"
                        }`}
                      >
                        {renderPhaseIcon(b.icon, iconColor)}
                        <span className="truncate flex-1">{b.label}</span>
                        {wasSelected && (
                          <span className="shrink-0 bg-brand text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {checkedItems.size + (otherItem.trim() ? 1 : 0)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {/* Loose Items */}
                  <button
                    type="button"
                    onClick={() => goToStep2(LOOSE)}
                    className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl border text-left text-base font-medium transition active:scale-[0.97] ${
                      selected === LOOSE && looseText.trim()
                        ? "border-brand bg-brand/5 text-text"
                        : "border-border bg-bg text-text hover:border-brand/40"
                    }`}
                  >
                    <ClipboardList size={20} strokeWidth={1.4} className="text-violet-500" />
                    <span className="truncate">Loose Items</span>
                  </button>
                </div>
              </div>

              {/* Lot picker — only for legacy mode */}
              {lots && !fixedLotId && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Lot *</label>
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
            </>
          )}

          {/* ═══════════ STEP 2: Select Items ═══════════ */}
          {step === 2 && isBundle && selected && BUNDLE_SUB_ITEMS[selected] && (
            <SubItemsInline
              phase={selected}
              subItems={BUNDLE_SUB_ITEMS[selected]}
              checkedItems={checkedItems}
              otherItem={otherItem}
              onCheckedChange={setCheckedItems}
              onOtherChange={setOtherItem}
            />
          )}

          {step === 2 && isLoose && (
            <div>
              <label className="flex items-center gap-1.5 text-base font-medium text-text mb-2">
                <Pencil size={16} />
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

          {step === 2 && (
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={loading || !step2Valid}
              className="w-full bg-brand text-white text-base font-semibold py-3.5 px-4 rounded-xl hover:bg-brand-dark active:scale-[0.98] transition disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
              ) : (
                `Send Request${extraLotIds.size > 0 ? ` (${1 + extraLotIds.size} lots)` : ""}`
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
