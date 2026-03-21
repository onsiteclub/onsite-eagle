"use client";

import { useEffect, useState } from "react";
import {
  Plus, MapPin, Loader2, Check, Copy, Link2,
  Truck, Trash2, AlertTriangle, Package, Users, X,
  Home, Building2, Archive, ArchiveRestore, Settings, Save,
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

interface Bundle {
  id: string;
  jobsite_id: string;
  label: string | null;
  lot_ids: string[];
}

export default function SetupPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  // Create site form
  const [siteName, setSiteName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [siteCity, setSiteCity] = useState("");
  const [lotCount, setLotCount] = useState("10");
  const [creatingSite, setCreatingSite] = useState(false);

  // Lots
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [allLots, setAllLots] = useState<Lot[]>([]);
  const [lotView, setLotView] = useState<"active" | "archived">("active");
  const [archiveSelection, setArchiveSelection] = useState<Set<string>>(new Set());
  const [archiving, setArchiving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedSiteId, setCopiedSiteId] = useState<string | null>(null);

  // Add lots
  const [addMode, setAddMode] = useState<"singles" | "block">("singles");
  const [singlesFrom, setSinglesFrom] = useState("");
  const [singlesTo, setSinglesTo] = useState("");
  const [blockNumber, setBlockNumber] = useState("");
  const [blockUnits, setBlockUnits] = useState("3");
  const [addingLots, setAddingLots] = useState(false);

  // Bundles
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [selectedLots, setSelectedLots] = useState<Set<string>>(new Set());
  const [bundleLabel, setBundleLabel] = useState("");
  const [creatingBundle, setCreatingBundle] = useState(false);
  const [copiedBundleId, setCopiedBundleId] = useState<string | null>(null);

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

  async function loadSites() {
    const res = await fetch("/api/sites");
    if (res.ok) {
      const data = await res.json();
      setSites(data);
      if (data.length > 0 && !selectedSite) {
        setSelectedSite(data[0].id);
      }
    }
    setLoading(false);
  }

  async function loadLots(siteId: string) {
    const res = await fetch("/api/lots");
    if (res.ok) {
      const data: Lot[] = await res.json();
      const siteLots = data.filter((l) => l.jobsite_id === siteId);
      setAllLots(siteLots);
      // Auto-set singles "from" to next available number
      const maxNum = siteLots
        .filter((l) => !l.block)
        .reduce((max, l) => Math.max(max, parseInt(l.lot_number) || 0), 0);
      setSinglesFrom(String(maxNum + 1));
      setSinglesTo(String(maxNum + 10));
    }
  }

  async function loadBundles(siteId: string) {
    const res = await fetch(`/api/bundles?site_id=${siteId}`);
    if (res.ok) {
      const data = await res.json();
      setBundles(data);
    }
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

  useEffect(() => {
    loadSites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedSite) {
      loadLots(selectedSite);
      loadBundles(selectedSite);
      setSelectedLots(new Set());
      setArchiveSelection(new Set());
      // Populate edit fields
      const site = sites.find((s) => s.id === selectedSite);
      if (site) {
        setEditName(site.name);
        setEditAddress(site.address ?? "");
        setEditCity(site.city ?? "");
        setEditDirty(false);
      }
    }
  }, [selectedSite, sites]);

  async function createSite(e: React.FormEvent) {
    e.preventDefault();
    if (!siteName.trim() || !lotCount) return;
    const count = parseInt(lotCount);
    if (count < 1 || count > 500) return;

    setCreatingSite(true);

    const res = await fetch("/api/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: siteName.trim(),
        address: siteAddress.trim() || null,
        city: siteCity.trim() || null,
      }),
    });

    if (res.ok) {
      const site = await res.json();

      await fetch("/api/lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobsite_id: site.id, count }),
      });

      setSiteName("");
      setSiteAddress("");
      setSiteCity("");
      setSelectedSite(site.id);
      await loadSites();
      await loadLots(site.id);
    }
    setCreatingSite(false);
  }

  async function addLots() {
    if (!selectedSite) return;
    setAddingLots(true);

    if (addMode === "singles") {
      const from = parseInt(singlesFrom);
      const to = parseInt(singlesTo);
      if (isNaN(from) || isNaN(to) || to < from) {
        setAddingLots(false);
        return;
      }
      const count = to - from + 1;
      await fetch("/api/lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobsite_id: selectedSite, count, from }),
      });
    } else {
      const bn = blockNumber.trim();
      const units = parseInt(blockUnits);
      if (!bn || isNaN(units) || units < 1) {
        setAddingLots(false);
        return;
      }
      await fetch("/api/lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobsite_id: selectedSite, block_number: bn, unit_count: units }),
      });
    }

    await loadLots(selectedSite);
    await loadSites();
    setBlockNumber("");
    setBlockUnits("3");
    setAddingLots(false);
  }

  function toggleLot(lotId: string) {
    setSelectedLots((prev) => {
      const next = new Set(prev);
      if (next.has(lotId)) next.delete(lotId);
      else next.add(lotId);
      return next;
    });
  }

  async function createBundle() {
    if (!selectedSite || selectedLots.size === 0) return;
    setCreatingBundle(true);

    const res = await fetch("/api/bundles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobsite_id: selectedSite,
        label: bundleLabel.trim() || null,
        lot_ids: Array.from(selectedLots),
      }),
    });

    if (res.ok) {
      setSelectedLots(new Set());
      setBundleLabel("");
      await loadBundles(selectedSite);
    }
    setCreatingBundle(false);
  }

  async function deleteBundle(bundleId: string) {
    await fetch(`/api/bundles/${bundleId}`, { method: "DELETE" });
    if (selectedSite) await loadBundles(selectedSite);
  }

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
        setBundles([]);
      }
      setDeleteTarget(null);
      setDeleteConfirm("");
      await loadSites();
    }
    setDeleting(false);
  }

  // Helper: get lot numbers for a bundle
  function bundleLotNumbers(bundle: Bundle): string {
    return bundle.lot_ids
      .map((id) => allLots.find((l) => l.id === id)?.lot_number)
      .filter(Boolean)
      .sort((a, b) => {
        // Natural sort: "1" < "2" < "4-1" < "4-2" < "10"
        const na = a!.split("-").map(Number);
        const nb = b!.split("-").map(Number);
        for (let i = 0; i < Math.max(na.length, nb.length); i++) {
          const va = na[i] ?? 0;
          const vb = nb[i] ?? 0;
          if (va !== vb) return va - vb;
        }
        return 0;
      })
      .join(", ");
  }

  // Group lots by status filter, then singles vs blocks
  function groupedLots(statusFilter: "active" | "archived") {
    const isArchived = statusFilter === "archived";
    const filtered = allLots.filter((l) =>
      isArchived ? l.status === "archived" : l.status !== "archived"
    );

    const singles: Lot[] = [];
    const blocks = new Map<string, Lot[]>();

    for (const lot of filtered) {
      if (lot.block) {
        const group = blocks.get(lot.block) || [];
        group.push(lot);
        blocks.set(lot.block, group);
      } else {
        singles.push(lot);
      }
    }

    singles.sort((a, b) => (parseInt(a.lot_number) || 0) - (parseInt(b.lot_number) || 0));

    const sortedBlocks = Array.from(blocks.entries()).sort(
      (a, b) => (parseInt(a[0]) || 0) - (parseInt(b[0]) || 0)
    );
    for (const [, lots] of sortedBlocks) {
      lots.sort((a, b) => {
        const ua = parseInt(a.lot_number.split("-")[1] || "0");
        const ub = parseInt(b.lot_number.split("-")[1] || "0");
        return ua - ub;
      });
    }

    return { singles, blocks: sortedBlocks, total: filtered.length };
  }

  // Singles preview
  const singlesPreviewCount = (() => {
    const from = parseInt(singlesFrom);
    const to = parseInt(singlesTo);
    if (isNaN(from) || isNaN(to) || to < from) return 0;
    return to - from + 1;
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-brand" />
      </div>
    );
  }

  const { singles, blocks, total } = groupedLots(lotView);
  const activeCount = allLots.filter((l) => l.status !== "archived").length;
  const archivedCount = allLots.filter((l) => l.status === "archived").length;

  return (
    <main className="pb-8">
      <div className="px-4 py-4 space-y-6">
        {/* Section 1: Site */}
        <section className="bg-card rounded-xl border border-border p-4 space-y-4">
          {/* Create form — only when no sites exist */}
          {sites.length === 0 && (
            <>
              <h2 className="font-semibold text-text flex items-center gap-2">
                <MapPin size={18} className="text-brand" />
                Create Site
              </h2>

              <form onSubmit={createSite} className="space-y-3">
                <input
                  type="text"
                  required
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                  placeholder="Site name *"
                />
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={siteAddress}
                    onChange={(e) => setSiteAddress(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                    placeholder="Address"
                  />
                  <input
                    type="text"
                    value={siteCity}
                    onChange={(e) => setSiteCity(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                    placeholder="City"
                  />
                  <input
                    type="number"
                    min={1}
                    max={500}
                    inputMode="numeric"
                    value={lotCount}
                    onChange={(e) => setLotCount(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                    placeholder="Lots"
                  />
                </div>
                <button
                  type="submit"
                  disabled={creatingSite || !siteName.trim() || !lotCount || parseInt(lotCount) < 1}
                  className="flex items-center justify-center gap-1.5 bg-brand text-white text-sm font-medium py-2.5 px-4 rounded-xl hover:bg-brand-dark active:scale-[0.98] transition disabled:opacity-50"
                >
                  {creatingSite ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Plus size={16} />
                  )}
                  Create Site + {lotCount || 0} lots
                </button>
              </form>
            </>
          )}

          {/* Existing sites */}
          {sites.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-text-muted font-medium uppercase">Site</p>
              {sites.map((site) => (
                <div
                  key={site.id}
                  className={`p-3 rounded-lg border cursor-pointer transition ${
                    selectedSite === site.id
                      ? "border-brand bg-brand/5"
                      : "border-border hover:bg-gray-50"
                  }`}
                  onClick={() => setSelectedSite(site.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-text">{site.name}</div>
                      {(site.city || site.address) && (
                        <div className="text-xs text-text-muted">
                          {[site.address, site.city].filter(Boolean).join(", ")}
                        </div>
                      )}
                    </div>
                    <span className="text-xs bg-gray-100 text-text-secondary px-2 py-0.5 rounded-full">
                      {site.total_lots} lots
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const url = `${window.location.origin}/operator/${site.id}`;
                        navigator.clipboard.writeText(url);
                        setCopiedSiteId(site.id);
                        setTimeout(() => setCopiedSiteId(null), 2000);
                      }}
                      className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition ${
                        copiedSiteId === site.id
                          ? "bg-green-50 text-green-600"
                          : "bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
                      }`}
                    >
                      {copiedSiteId === site.id ? (
                        <>
                          <Check size={12} />
                          Copied
                        </>
                      ) : (
                        <>
                          <Truck size={12} />
                          Copy Operator Link
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 2: Lots + Bundle creation */}
        {selectedSite && allLots.length > 0 && (
          <section className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-text flex items-center gap-2">
                <Link2 size={18} className="text-brand" />
                Lot Links
              </h2>
            </div>

            {/* Active / Archived tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => { setLotView("active"); setArchiveSelection(new Set()); }}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${
                  lotView === "active"
                    ? "bg-white text-brand shadow-sm"
                    : "text-text-muted hover:text-text"
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                onClick={() => { setLotView("archived"); setArchiveSelection(new Set()); }}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${
                  lotView === "archived"
                    ? "bg-white text-amber-600 shadow-sm"
                    : "text-text-muted hover:text-text"
                }`}
              >
                <span className="flex items-center justify-center gap-1">
                  <Archive size={12} />
                  Archived ({archivedCount})
                </span>
              </button>
            </div>

            {lotView === "active" && (
              <p className="text-xs text-text-muted">
                Select lots to create a worker bundle, or copy individual links.
              </p>
            )}

            {/* Bundle creation bar — only in active view */}
            {lotView === "active" && selectedLots.size > 0 && (
              <div className="flex items-center gap-2 p-3 bg-brand/5 border border-brand/20 rounded-lg">
                <input
                  type="text"
                  value={bundleLabel}
                  onChange={(e) => setBundleLabel(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-white text-text text-sm outline-none focus:ring-2 focus:ring-brand/30"
                  placeholder="Worker name (optional)"
                />
                <button
                  onClick={createBundle}
                  disabled={creatingBundle}
                  className="flex items-center gap-1.5 bg-brand text-white text-sm font-medium py-2 px-3 rounded-lg hover:bg-brand-dark active:scale-[0.98] transition disabled:opacity-50 whitespace-nowrap"
                >
                  {creatingBundle ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Users size={14} />
                  )}
                  Bundle {selectedLots.size} lots
                </button>
                <button
                  onClick={() => setSelectedLots(new Set())}
                  className="p-2 text-text-muted hover:text-text rounded-lg hover:bg-white transition"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Archive action bar */}
            {archiveSelection.size > 0 && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <span className="text-sm text-amber-700 font-medium flex-1">
                  {archiveSelection.size} lot{archiveSelection.size > 1 ? "s" : ""} selected
                </span>
                <button
                  onClick={() => updateLotStatus(Array.from(archiveSelection), lotView === "active" ? "archived" : "pending")}
                  disabled={archiving}
                  className={`flex items-center gap-1.5 text-sm font-medium py-2 px-3 rounded-lg active:scale-[0.98] transition disabled:opacity-50 whitespace-nowrap ${
                    lotView === "active"
                      ? "bg-amber-600 text-white hover:bg-amber-700"
                      : "bg-brand text-white hover:bg-brand-dark"
                  }`}
                >
                  {archiving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : lotView === "active" ? (
                    <Archive size={14} />
                  ) : (
                    <ArchiveRestore size={14} />
                  )}
                  {lotView === "active" ? "Archive" : "Unarchive"}
                </button>
                <button
                  onClick={() => setArchiveSelection(new Set())}
                  className="p-2 text-text-muted hover:text-text rounded-lg hover:bg-white transition"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Select all / none for archive */}
            {total > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const allIds = new Set([
                      ...singles.map((l) => l.id),
                      ...blocks.flatMap(([, lots]) => lots.map((l) => l.id)),
                    ]);
                    setArchiveSelection(allIds);
                  }}
                  className="text-xs text-brand hover:underline"
                >
                  Select all ({total})
                </button>
                {archiveSelection.size > 0 && (
                  <button
                    onClick={() => setArchiveSelection(new Set())}
                    className="text-xs text-text-muted hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}

            {/* Lot list — grouped */}
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {total === 0 && (
                <div className="flex flex-col items-center py-8 text-text-muted">
                  {lotView === "archived" ? (
                    <>
                      <Archive size={32} className="mb-2 opacity-40" />
                      <p className="text-sm">No archived lots</p>
                    </>
                  ) : (
                    <p className="text-sm">No active lots</p>
                  )}
                </div>
              )}

              {/* Singles */}
              {singles.map((lot) => (
                <LotRow
                  key={lot.id}
                  lot={lot}
                  selected={lotView === "active" ? selectedLots.has(lot.id) : false}
                  archiveSelected={archiveSelection.has(lot.id)}
                  copiedId={copiedId}
                  onToggle={lotView === "active" ? () => toggleLot(lot.id) : undefined}
                  onArchiveToggle={() => {
                    setArchiveSelection((prev) => {
                      const next = new Set(prev);
                      if (next.has(lot.id)) next.delete(lot.id);
                      else next.add(lot.id);
                      return next;
                    });
                  }}
                  onCopy={() => {
                    const url = `${window.location.origin}/request/${lot.id}`;
                    navigator.clipboard.writeText(url);
                    setCopiedId(lot.id);
                    setTimeout(() => setCopiedId(null), 2000);
                  }}
                  isArchived={lotView === "archived"}
                />
              ))}

              {/* Blocks */}
              {blocks.map(([blockId, blockLots]) => (
                <div key={`block-${blockId}`} className={`border rounded-lg overflow-hidden ${lotView === "archived" ? "border-amber-200" : "border-blue-200"}`}>
                  <div className={`px-3 py-1.5 flex items-center gap-1.5 ${lotView === "archived" ? "bg-amber-50" : "bg-blue-50"}`}>
                    <Building2 size={12} className={lotView === "archived" ? "text-amber-600" : "text-blue-600"} />
                    <span className={`text-xs font-medium ${lotView === "archived" ? "text-amber-700" : "text-blue-700"}`}>Block {blockId}</span>
                    <span className={`text-xs ${lotView === "archived" ? "text-amber-500" : "text-blue-500"}`}>{blockLots.length} units</span>
                  </div>
                  <div className="space-y-0.5 p-1">
                    {blockLots.map((lot) => (
                      <LotRow
                        key={lot.id}
                        lot={lot}
                        selected={lotView === "active" ? selectedLots.has(lot.id) : false}
                        archiveSelected={archiveSelection.has(lot.id)}
                        copiedId={copiedId}
                        onToggle={lotView === "active" ? () => toggleLot(lot.id) : undefined}
                        onArchiveToggle={() => {
                          setArchiveSelection((prev) => {
                            const next = new Set(prev);
                            if (next.has(lot.id)) next.delete(lot.id);
                            else next.add(lot.id);
                            return next;
                          });
                        }}
                        onCopy={() => {
                          const url = `${window.location.origin}/request/${lot.id}`;
                          navigator.clipboard.writeText(url);
                          setCopiedId(lot.id);
                          setTimeout(() => setCopiedId(null), 2000);
                        }}
                        compact
                        isArchived={lotView === "archived"}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 3: Existing bundles */}
        {selectedSite && bundles.length > 0 && (
          <section className="bg-card rounded-xl border border-border p-4 space-y-3">
            <h2 className="font-semibold text-text flex items-center gap-2">
              <Package size={18} className="text-brand" />
              Worker Bundles
            </h2>
            <div className="space-y-2">
              {bundles.map((bundle) => (
                <div
                  key={bundle.id}
                  className="p-3 rounded-lg border border-border"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-text">
                        {bundle.label || "Unnamed worker"}
                      </div>
                      <div className="text-xs text-text-muted">
                        Lots: {bundleLotNumbers(bundle) || `${bundle.lot_ids.length} lots`}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/bundle/${bundle.id}`;
                          navigator.clipboard.writeText(url);
                          setCopiedBundleId(bundle.id);
                          setTimeout(() => setCopiedBundleId(null), 2000);
                        }}
                        className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition ${
                          copiedBundleId === bundle.id
                            ? "bg-green-50 text-green-600"
                            : "bg-brand/10 text-brand hover:bg-brand/20"
                        }`}
                      >
                        {copiedBundleId === bundle.id ? (
                          <>
                            <Check size={12} />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            Copy Link
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => deleteBundle(bundle.id)}
                        className="p-1.5 text-text-muted hover:text-red-500 rounded-lg hover:bg-red-50 transition"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 4: Site Settings — edit + add lots */}
        {selectedSite && (
          <section className="bg-card rounded-xl border border-border p-4 space-y-4">
            <h2 className="font-semibold text-text flex items-center gap-2">
              <Settings size={18} className="text-text-muted" />
              Site Settings
            </h2>

            {/* Edit site fields */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-text-muted font-medium mb-1">Site Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => { setEditName(e.target.value); setEditDirty(true); }}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                  placeholder="Site name *"
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
                  {savingSite ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  Save Changes
                </button>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Add Lots */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-text">Add Lots</h3>

              {/* Mode tabs */}
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setAddMode("singles")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition ${
                    addMode === "singles"
                      ? "bg-white text-brand shadow-sm"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  <Home size={14} />
                  Singles
                </button>
                <button
                  onClick={() => setAddMode("block")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition ${
                    addMode === "block"
                      ? "bg-white text-brand shadow-sm"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  <Building2 size={14} />
                  Block
                </button>
              </div>

              {addMode === "singles" ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-text-muted font-medium mb-1">From</label>
                      <input
                        type="number"
                        min={1}
                        inputMode="numeric"
                        value={singlesFrom}
                        onChange={(e) => setSinglesFrom(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted font-medium mb-1">To</label>
                      <input
                        type="number"
                        min={1}
                        inputMode="numeric"
                        value={singlesTo}
                        onChange={(e) => setSinglesTo(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                      />
                    </div>
                  </div>
                  {singlesPreviewCount > 0 && (
                    <p className="text-xs text-text-muted">
                      Will create <strong>{singlesPreviewCount}</strong> lots: {singlesFrom} to {singlesTo}
                    </p>
                  )}
                  <button
                    onClick={addLots}
                    disabled={addingLots || singlesPreviewCount < 1}
                    className="w-full flex items-center justify-center gap-1.5 bg-brand text-white text-sm font-medium py-2.5 px-4 rounded-xl hover:bg-brand-dark active:scale-[0.98] transition disabled:opacity-50"
                  >
                    {addingLots ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Plus size={16} />
                    )}
                    Add {singlesPreviewCount} Singles
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-text-muted font-medium mb-1">Block #</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={blockNumber}
                        onChange={(e) => setBlockNumber(e.target.value)}
                        placeholder="e.g. 4"
                        className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted font-medium mb-1">Units</label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        inputMode="numeric"
                        value={blockUnits}
                        onChange={(e) => setBlockUnits(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                      />
                    </div>
                  </div>
                  {blockNumber.trim() && parseInt(blockUnits) > 0 && (
                    <p className="text-xs text-text-muted">
                      Will create <strong>{blockUnits}</strong> lots:{" "}
                      {Array.from({ length: Math.min(parseInt(blockUnits) || 0, 8) }, (_, i) => `${blockNumber}-${i + 1}`).join(", ")}
                      {(parseInt(blockUnits) || 0) > 8 && ", ..."}
                    </p>
                  )}
                  <button
                    onClick={addLots}
                    disabled={addingLots || !blockNumber.trim() || !parseInt(blockUnits)}
                    className="w-full flex items-center justify-center gap-1.5 bg-brand text-white text-sm font-medium py-2.5 px-4 rounded-xl hover:bg-brand-dark active:scale-[0.98] transition disabled:opacity-50"
                  >
                    {addingLots ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Building2 size={16} />
                    )}
                    Add Block {blockNumber || "..."}
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Section 5: Danger Zone */}
        {selectedSite && (
          <section className="bg-card rounded-xl border border-red-200 p-4 space-y-4">
            <h2 className="font-semibold text-red-600 flex items-center gap-2">
              <AlertTriangle size={18} />
              Danger Zone
            </h2>

            {!deleteTarget ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text">Delete this site</p>
                  <p className="text-xs text-text-muted">
                    Permanently remove the site, all its lots, and all requests.
                  </p>
                </div>
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
                  all associated requests. This action cannot be undone.
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
                    onClick={() => {
                      setDeleteTarget(null);
                      setDeleteConfirm("");
                    }}
                    className="px-3 py-2 text-sm text-text-secondary rounded-lg hover:bg-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={deleteSite}
                    disabled={deleting || deleteConfirm !== deleteTarget.name}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-red-700 active:scale-[0.98] transition disabled:opacity-40"
                  >
                    {deleting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
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

function LotRow({
  lot,
  selected,
  archiveSelected,
  copiedId,
  onToggle,
  onArchiveToggle,
  onCopy,
  compact,
  isArchived,
}: {
  lot: Lot;
  selected: boolean;
  archiveSelected: boolean;
  copiedId: string | null;
  onToggle?: () => void;
  onArchiveToggle: () => void;
  onCopy: () => void;
  compact?: boolean;
  isArchived?: boolean;
}) {
  const isSelected = archiveSelected || selected;

  return (
    <div
      className={`flex items-center gap-3 ${compact ? "p-2" : "p-2.5"} rounded-lg border transition cursor-pointer ${
        archiveSelected
          ? "border-amber-400 bg-amber-50"
          : selected
            ? "border-brand bg-brand/5"
            : isArchived
              ? "border-border/50 bg-gray-50/50"
              : "border-border hover:bg-gray-50"
      }`}
      onClick={onArchiveToggle}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onArchiveToggle}
        className={`w-4 h-4 rounded border-border focus:ring-brand/30 ${
          archiveSelected ? "accent-amber-600" : "accent-[var(--color-brand,#0F766E)]"
        }`}
      />
      <span className={`${compact ? "text-xs" : "text-sm"} font-medium flex-1 ${isArchived ? "text-text-muted" : "text-text"}`}>
        Lot {lot.lot_number}
      </span>
      {!isArchived && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCopy();
          }}
          className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md transition ${
            copiedId === lot.id
              ? "bg-green-50 text-green-600"
              : "bg-brand/10 text-brand hover:bg-brand/20"
          }`}
        >
          {copiedId === lot.id ? (
            <>
              <Check size={10} />
              Copied
            </>
          ) : (
            <>
              <Copy size={10} />
              Link
            </>
          )}
        </button>
      )}
    </div>
  );
}
