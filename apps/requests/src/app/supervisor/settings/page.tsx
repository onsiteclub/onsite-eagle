"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2, Save, Trash2, AlertTriangle, Settings,
  MapPin, Archive, ArchiveRestore, X, Pencil, Check,
  Home, Building2, Plus,
} from "lucide-react";

interface Site {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  total_lots: number;
}

interface Lot {
  id: string;
  lot_number: string;
  block: string | null;
  status: string;
  jobsite_id?: string;
}

export default function SettingsPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit site
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCity, setEditCity] = useState("");
  const [savingSite, setSavingSite] = useState(false);
  const [editDirty, setEditDirty] = useState(false);

  // Delete site
  const [deleteTarget, setDeleteTarget] = useState<Site | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Lots management
  const [allLots, setAllLots] = useState<Lot[]>([]);
  const [lotView, setLotView] = useState<"active" | "archived">("active");
  const [archiveSelection, setArchiveSelection] = useState<Set<string>>(new Set());
  const [archiving, setArchiving] = useState(false);

  // Edit lot
  const [editingLotId, setEditingLotId] = useState<string | null>(null);
  const [editingLotValue, setEditingLotValue] = useState("");
  const [savingLot, setSavingLot] = useState(false);

  // Add lots
  const [showAddLots, setShowAddLots] = useState(false);
  const [addMode, setAddMode] = useState<"singles" | "block">("singles");
  const [singlesFrom, setSinglesFrom] = useState("");
  const [singlesTo, setSinglesTo] = useState("");
  const [blockNumber, setBlockNumber] = useState("");
  const [blockUnits, setBlockUnits] = useState("4");
  const [addingLots, setAddingLots] = useState(false);

  const loadSites = useCallback(async () => {
    const res = await fetch("/api/sites");
    if (res.ok) {
      const data = await res.json();
      setSites(data);
      if (data.length > 0 && !selectedSite) {
        setSelectedSite(data[0].id);
      }
    }
    setLoading(false);
  }, [selectedSite]);

  const loadLots = useCallback(async (siteId: string) => {
    const res = await fetch("/api/lots");
    if (res.ok) {
      const data: Lot[] = await res.json();
      setAllLots(data.filter((l) => l.jobsite_id === siteId));
    }
  }, []);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  useEffect(() => {
    if (selectedSite) {
      loadLots(selectedSite);
      setArchiveSelection(new Set());
      const site = sites.find((s) => s.id === selectedSite);
      if (site) {
        setEditName(site.name);
        setEditAddress(site.address ?? "");
        setEditCity(site.city ?? "");
        setEditDirty(false);
      }
    }
  }, [selectedSite, sites, loadLots]);

  async function saveSite() {
    if (!selectedSite || !editName.trim()) return;
    setSavingSite(true);
    const res = await fetch(`/api/sites/${selectedSite}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName.trim(),
        address: editAddress.trim() || null,
        city: editCity.trim() || null,
      }),
    });
    if (res.ok) {
      setEditDirty(false);
      await loadSites();
    }
    setSavingSite(false);
  }

  async function deleteSite() {
    if (!deleteTarget || deleteConfirm !== deleteTarget.name) return;
    setDeleting(true);
    const res = await fetch(`/api/sites/${deleteTarget.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm_name: deleteTarget.name }),
    });
    if (res.ok) {
      if (selectedSite === deleteTarget.id) {
        setSelectedSite(null);
        setAllLots([]);
      }
      setDeleteTarget(null);
      setDeleteConfirm("");
      await loadSites();
    }
    setDeleting(false);
  }

  async function updateLotStatus(lotIds: string[], status: "archived" | "pending") {
    if (lotIds.length === 0) return;
    setArchiving(true);
    await fetch("/api/lots", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lot_ids: lotIds, status }),
    });
    setArchiveSelection(new Set());
    if (selectedSite) await loadLots(selectedSite);
    setArchiving(false);
  }

  async function renameLot(lotId: string, newName: string) {
    if (!newName.trim()) return;
    setSavingLot(true);
    const res = await fetch(`/api/lots/${lotId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lot_number: newName.trim() }),
    });
    if (res.ok) {
      setEditingLotId(null);
      setEditingLotValue("");
      if (selectedSite) await loadLots(selectedSite);
    }
    setSavingLot(false);
  }

  async function addLots() {
    if (!selectedSite) return;
    setAddingLots(true);
    if (addMode === "singles") {
      const from = parseInt(singlesFrom);
      const to = parseInt(singlesTo);
      if (!isNaN(from) && !isNaN(to) && to >= from) {
        await fetch("/api/lots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobsite_id: selectedSite, count: to - from + 1, from }),
        });
      }
    } else {
      const bn = blockNumber.trim();
      const units = parseInt(blockUnits);
      if (bn && !isNaN(units) && units > 0) {
        await fetch("/api/lots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobsite_id: selectedSite, block_number: bn, unit_count: units }),
        });
      }
    }
    await loadLots(selectedSite);
    await loadSites();
    setBlockNumber("");
    setBlockUnits("4");
    setAddingLots(false);
    setShowAddLots(false);
  }

  // Group lots
  const filteredLots = allLots.filter((l) =>
    lotView === "archived" ? l.status === "archived" : l.status !== "archived"
  );
  const activeLots = allLots.filter((l) => l.status !== "archived");
  const archivedLots = allLots.filter((l) => l.status === "archived");

  const singles = filteredLots.filter((l) => !l.block).sort(
    (a, b) => (parseInt(a.lot_number) || 0) - (parseInt(b.lot_number) || 0)
  );
  const blockMap = new Map<string, Lot[]>();
  for (const lot of filteredLots.filter((l) => l.block)) {
    const arr = blockMap.get(lot.block!) || [];
    arr.push(lot);
    blockMap.set(lot.block!, arr);
  }
  const blocks = Array.from(blockMap.entries()).sort(
    (a, b) => (parseInt(a[0]) || 0) - (parseInt(b[0]) || 0)
  );
  for (const [, lots] of blocks) {
    lots.sort((a, b) => {
      const ua = a.lot_number.split("-")[1] || "";
      const ub = b.lot_number.split("-")[1] || "";
      return ua.localeCompare(ub);
    });
  }

  const singlesPreviewCount = (() => {
    const f = parseInt(singlesFrom);
    const t = parseInt(singlesTo);
    if (isNaN(f) || isNaN(t) || t < f) return 0;
    return t - f + 1;
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-brand" />
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <Settings size={48} className="text-text-muted/30 mb-3" />
        <p className="text-sm text-text-muted">No sites yet. Create one in the Links tab.</p>
      </div>
    );
  }

  return (
    <main className="pb-8">
      <div className="px-4 py-4 space-y-4">

        {/* Site selector */}
        {sites.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {sites.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSite(s.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  selectedSite === s.id
                    ? "bg-brand text-white"
                    : "bg-gray-100 text-text-secondary hover:bg-gray-200"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        {/* Site details */}
        {selectedSite && (
          <section className="bg-card rounded-xl border border-border p-4 space-y-3">
            <h2 className="font-semibold text-text flex items-center gap-2">
              <MapPin size={16} className="text-brand" />
              Site Details
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-text-muted font-medium mb-1">Site Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => { setEditName(e.target.value); setEditDirty(true); }}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted font-medium mb-1">Address</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => { setEditAddress(e.target.value); setEditDirty(true); }}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                    placeholder="Address"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted font-medium mb-1">City</label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => { setEditCity(e.target.value); setEditDirty(true); }}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                    placeholder="City"
                  />
                </div>
              </div>
              {editDirty && (
                <button
                  onClick={saveSite}
                  disabled={savingSite || !editName.trim()}
                  className="flex items-center justify-center gap-1.5 bg-brand text-white text-sm font-medium py-2.5 px-4 rounded-xl hover:bg-brand-dark active:scale-[0.98] transition disabled:opacity-50"
                >
                  {savingSite ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save Changes
                </button>
              )}
            </div>
          </section>
        )}

        {/* Lot management */}
        {selectedSite && allLots.length > 0 && (
          <section className="bg-card rounded-xl border border-border p-4 space-y-3">
            <h2 className="font-semibold text-text text-sm">Manage Lots</h2>

            {/* Active / Archived tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => { setLotView("active"); setArchiveSelection(new Set()); }}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${
                  lotView === "active" ? "bg-white text-brand shadow-sm" : "text-text-muted"
                }`}
              >
                Active ({activeLots.length})
              </button>
              <button
                onClick={() => { setLotView("archived"); setArchiveSelection(new Set()); }}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${
                  lotView === "archived" ? "bg-white text-amber-600 shadow-sm" : "text-text-muted"
                }`}
              >
                <span className="flex items-center justify-center gap-1">
                  <Archive size={12} />
                  Archived ({archivedLots.length})
                </span>
              </button>
            </div>

            {/* Archive action bar */}
            {archiveSelection.size > 0 && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <span className="text-sm text-amber-700 font-medium flex-1">
                  {archiveSelection.size} selected
                </span>
                <button
                  onClick={() => updateLotStatus(Array.from(archiveSelection), lotView === "active" ? "archived" : "pending")}
                  disabled={archiving}
                  className={`flex items-center gap-1.5 text-sm font-medium py-2 px-3 rounded-lg transition disabled:opacity-50 ${
                    lotView === "active" ? "bg-amber-600 text-white" : "bg-brand text-white"
                  }`}
                >
                  {archiving ? <Loader2 size={14} className="animate-spin" /> :
                    lotView === "active" ? <Archive size={14} /> : <ArchiveRestore size={14} />}
                  {lotView === "active" ? "Archive" : "Unarchive"}
                </button>
                <button onClick={() => setArchiveSelection(new Set())} className="p-2 text-text-muted hover:text-text rounded-lg hover:bg-white transition">
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Lot list */}
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {filteredLots.length === 0 && (
                <p className="text-xs text-text-muted py-4 text-center">
                  {lotView === "archived" ? "No archived lots" : "No active lots"}
                </p>
              )}

              {singles.map((lot) => (
                <LotItem
                  key={lot.id}
                  lot={lot}
                  selected={archiveSelection.has(lot.id)}
                  onToggle={() => {
                    setArchiveSelection((prev) => {
                      const next = new Set(prev);
                      if (next.has(lot.id)) next.delete(lot.id); else next.add(lot.id);
                      return next;
                    });
                  }}
                  editing={editingLotId === lot.id}
                  editValue={editingLotId === lot.id ? editingLotValue : ""}
                  saving={savingLot}
                  isArchived={lotView === "archived"}
                  onEditStart={() => { setEditingLotId(lot.id); setEditingLotValue(lot.lot_number); }}
                  onEditChange={setEditingLotValue}
                  onEditSave={() => renameLot(lot.id, editingLotValue)}
                  onEditCancel={() => { setEditingLotId(null); setEditingLotValue(""); }}
                />
              ))}

              {blocks.map(([blockId, blockLots]) => (
                <div key={`block-${blockId}`} className={`border rounded-lg overflow-hidden ${lotView === "archived" ? "border-amber-200" : "border-blue-200"}`}>
                  <div className={`px-3 py-1.5 flex items-center gap-1.5 ${lotView === "archived" ? "bg-amber-50" : "bg-blue-50"}`}>
                    <Building2 size={12} className={lotView === "archived" ? "text-amber-600" : "text-blue-600"} />
                    <span className={`text-xs font-medium ${lotView === "archived" ? "text-amber-700" : "text-blue-700"}`}>Block {blockId}</span>
                    <span className={`text-xs ${lotView === "archived" ? "text-amber-500" : "text-blue-500"}`}>{blockLots.length} units</span>
                  </div>
                  <div className="space-y-0.5 p-1">
                    {blockLots.map((lot) => (
                      <LotItem
                        key={lot.id}
                        lot={lot}
                        compact
                        selected={archiveSelection.has(lot.id)}
                        onToggle={() => {
                          setArchiveSelection((prev) => {
                            const next = new Set(prev);
                            if (next.has(lot.id)) next.delete(lot.id); else next.add(lot.id);
                            return next;
                          });
                        }}
                        editing={editingLotId === lot.id}
                        editValue={editingLotId === lot.id ? editingLotValue : ""}
                        saving={savingLot}
                        isArchived={lotView === "archived"}
                        onEditStart={() => { setEditingLotId(lot.id); setEditingLotValue(lot.lot_number); }}
                        onEditChange={setEditingLotValue}
                        onEditSave={() => renameLot(lot.id, editingLotValue)}
                        onEditCancel={() => { setEditingLotId(null); setEditingLotValue(""); }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Add lots (collapsible) */}
        {selectedSite && (
          <>
            <button
              onClick={() => setShowAddLots((v) => !v)}
              className="w-full flex items-center gap-2 px-4 py-3 bg-card rounded-xl border border-border text-sm font-medium text-text-secondary hover:bg-gray-50 transition"
            >
              <Plus size={16} className="text-brand" />
              Add Lots
              <span className="ml-auto text-xs text-text-muted">{showAddLots ? "\u25B2" : "\u25BC"}</span>
            </button>

            {showAddLots && (
              <section className="bg-card rounded-xl border border-border p-4 space-y-3">
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setAddMode("singles")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition ${
                      addMode === "singles" ? "bg-white text-brand shadow-sm" : "text-text-muted"
                    }`}
                  >
                    <Home size={14} /> Singles
                  </button>
                  <button
                    onClick={() => setAddMode("block")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition ${
                      addMode === "block" ? "bg-white text-brand shadow-sm" : "text-text-muted"
                    }`}
                  >
                    <Building2 size={14} /> Block
                  </button>
                </div>

                {addMode === "singles" ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-text-muted font-medium mb-1">From</label>
                        <input type="number" min={1} inputMode="numeric" value={singlesFrom}
                          onChange={(e) => setSinglesFrom(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
                      </div>
                      <div>
                        <label className="block text-xs text-text-muted font-medium mb-1">To</label>
                        <input type="number" min={1} inputMode="numeric" value={singlesTo}
                          onChange={(e) => setSinglesTo(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
                      </div>
                    </div>
                    {singlesPreviewCount > 0 && (
                      <p className="text-xs text-text-muted">Will create <strong>{singlesPreviewCount}</strong> lots</p>
                    )}
                    <button onClick={addLots} disabled={addingLots || singlesPreviewCount < 1}
                      className="w-full flex items-center justify-center gap-1.5 bg-brand text-white text-sm font-medium py-2.5 px-4 rounded-xl hover:bg-brand-dark active:scale-[0.98] transition disabled:opacity-50">
                      {addingLots ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                      Add {singlesPreviewCount} Singles
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-text-muted font-medium mb-1">Block #</label>
                        <input type="text" inputMode="numeric" value={blockNumber}
                          onChange={(e) => setBlockNumber(e.target.value)} placeholder="e.g. 70"
                          className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
                      </div>
                      <div>
                        <label className="block text-xs text-text-muted font-medium mb-1">Units</label>
                        <input type="number" min={1} max={26} inputMode="numeric" value={blockUnits}
                          onChange={(e) => setBlockUnits(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand" />
                      </div>
                    </div>
                    {blockNumber.trim() && parseInt(blockUnits) > 0 && (
                      <p className="text-xs text-text-muted">
                        {Array.from({ length: Math.min(parseInt(blockUnits) || 0, 8) }, (_, i) => `${blockNumber}-${String.fromCharCode(65 + i)}`).join(", ")}
                        {(parseInt(blockUnits) || 0) > 8 && ", ..."}
                      </p>
                    )}
                    <button onClick={addLots} disabled={addingLots || !blockNumber.trim() || !parseInt(blockUnits)}
                      className="w-full flex items-center justify-center gap-1.5 bg-brand text-white text-sm font-medium py-2.5 px-4 rounded-xl hover:bg-brand-dark active:scale-[0.98] transition disabled:opacity-50">
                      {addingLots ? <Loader2 size={16} className="animate-spin" /> : <Building2 size={16} />}
                      Add Block {blockNumber || "..."}
                    </button>
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {/* Danger Zone */}
        {selectedSite && (
          <section className="bg-card rounded-xl border border-red-200 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-red-600 flex items-center gap-1.5">
              <AlertTriangle size={14} />
              Danger Zone
            </h3>

            {!deleteTarget ? (
              <div className="flex items-center justify-between">
                <p className="text-xs text-text-muted">
                  Permanently remove site, lots, and requests.
                </p>
                <button
                  onClick={() => {
                    const site = sites.find((s) => s.id === selectedSite);
                    if (site) setDeleteTarget(site);
                  }}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
                >
                  <Trash2 size={14} />
                  Delete Site
                </button>
              </div>
            ) : (
              <div className="space-y-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">
                  This will permanently delete <strong>{deleteTarget.name}</strong>,
                  including <strong>{deleteTarget.total_lots} lot{deleteTarget.total_lots !== 1 ? "s" : ""}</strong> and
                  all associated requests.
                </p>
                <div>
                  <label className="block text-xs text-red-600 font-medium mb-1">
                    Type &quot;{deleteTarget.name}&quot; to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-red-300 bg-white text-text text-sm outline-none focus:ring-2 focus:ring-red-300"
                    placeholder={deleteTarget.name}
                    autoFocus
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setDeleteTarget(null); setDeleteConfirm(""); }}
                    className="px-3 py-2 text-sm text-text-secondary bg-white rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={deleteSite}
                    disabled={deleting || deleteConfirm !== deleteTarget.name}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-red-700 active:scale-[0.98] transition disabled:opacity-40"
                  >
                    {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    Permanently Delete
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function LotItem({
  lot, selected, onToggle, compact, editing, editValue, saving, isArchived,
  onEditStart, onEditChange, onEditSave, onEditCancel,
}: {
  lot: Lot; selected: boolean; onToggle: () => void; compact?: boolean;
  editing: boolean; editValue: string; saving: boolean; isArchived: boolean;
  onEditStart: () => void; onEditChange: (v: string) => void;
  onEditSave: () => void; onEditCancel: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 ${compact ? "p-2" : "p-2.5"} rounded-lg border transition ${
        editing ? "border-brand bg-brand/5"
        : selected ? "border-amber-400 bg-amber-50 cursor-pointer"
        : isArchived ? "border-border/50 bg-gray-50/50 cursor-pointer"
        : "border-border hover:bg-gray-50 cursor-pointer"
      }`}
      onClick={editing ? undefined : onToggle}
    >
      {!editing && (
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded accent-[var(--color-brand,#0F766E)]"
        />
      )}
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onEditSave(); if (e.key === "Escape") onEditCancel(); }}
              autoFocus
              className="flex-1 px-2 py-1 rounded-md border border-brand/30 bg-white text-sm text-text outline-none focus:ring-2 focus:ring-brand/30"
            />
            <button onClick={onEditSave} disabled={saving}
              className="p-1.5 bg-brand text-white rounded-md hover:bg-brand-dark transition disabled:opacity-50">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            </button>
            <button onClick={onEditCancel} className="p-1.5 text-text-muted hover:text-text rounded-md hover:bg-gray-100 transition">
              <X size={12} />
            </button>
          </div>
        ) : (
          <span className={`${compact ? "text-xs" : "text-sm"} font-medium ${isArchived ? "text-text-muted" : "text-text"}`}>
            Lot {lot.lot_number}
          </span>
        )}
      </div>
      {!editing && !isArchived && (
        <button
          onClick={(e) => { e.stopPropagation(); onEditStart(); }}
          className="p-1.5 text-text-muted hover:text-brand hover:bg-brand/10 rounded-md transition"
          title="Rename"
        >
          <Pencil size={12} />
        </button>
      )}
    </div>
  );
}
