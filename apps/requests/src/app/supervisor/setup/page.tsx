"use client";

import { useEffect, useState } from "react";
import {
  Plus, MapPin, Loader2, Check, Copy, Link2,
  Truck, Trash2, AlertTriangle, X,
  Home, Building2, Archive, ArchiveRestore, Settings, Save,
  Pencil,
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
  registered_workers?: string[];
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
  const [blockNaming, setBlockNaming] = useState<"letters" | "numbers">("letters");
  const [addingLots, setAddingLots] = useState(false);

  // Edit site
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCity, setEditCity] = useState("");
  const [savingSite, setSavingSite] = useState(false);
  const [editDirty, setEditDirty] = useState(false);

  // Edit lot
  const [editingLotId, setEditingLotId] = useState<string | null>(null);
  const [editingLotValue, setEditingLotValue] = useState("");
  const [savingLot, setSavingLot] = useState(false);

  // Quick add single lot
  const [quickLotNumber, setQuickLotNumber] = useState("");
  const [quickAdding, setQuickAdding] = useState(false);

  // Block link selection mode
  const [blockLinkMode, setBlockLinkMode] = useState<string | null>(null); // blockId or null
  const [blockLinkSelection, setBlockLinkSelection] = useState<Set<string>>(new Set());
  const [blockLinkLoading, setBlockLinkLoading] = useState(false);

  // Site settings toggle
  const [showSettings, setShowSettings] = useState(false);

  // Delete site
  const [deleteTarget, setDeleteTarget] = useState<Site | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  function startBlockLinkMode(blockId: string, blockLots: Lot[]) {
    setBlockLinkMode(blockId);
    // Pre-select all units
    setBlockLinkSelection(new Set(blockLots.map((l) => l.id)));
  }

  function cancelBlockLinkMode() {
    setBlockLinkMode(null);
    setBlockLinkSelection(new Set());
  }

  function toggleBlockLinkLot(lotId: string) {
    setBlockLinkSelection((prev) => {
      const next = new Set(prev);
      if (next.has(lotId)) next.delete(lotId);
      else next.add(lotId);
      return next;
    });
  }

  async function createBlockLink(blockId: string) {
    if (!selectedSite || blockLinkSelection.size === 0 || blockLinkLoading) return;
    setBlockLinkLoading(true);
    try {
      const res = await fetch("/api/bundles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobsite_id: selectedSite,
          label: `Block ${blockId}`,
          lot_ids: Array.from(blockLinkSelection),
        }),
      });
      if (res.ok) {
        const bundle = await res.json();
        const url = `${window.location.origin}/bundle/${bundle.id}`;
        await navigator.clipboard.writeText(url);
        setCopiedId(`block-${blockId}`);
        setTimeout(() => setCopiedId(null), 2000);
        cancelBlockLinkMode();
      }
    } finally {
      setBlockLinkLoading(false);
    }
  }

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
        body: JSON.stringify({ jobsite_id: selectedSite, block_number: bn, unit_count: units, unit_naming: blockNaming }),
      });
    }

    await loadLots(selectedSite);
    await loadSites();
    setBlockNumber("");
    setBlockUnits("3");
    setAddingLots(false);
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
      }
      setDeleteTarget(null);
      setDeleteConfirm("");
      await loadSites();
    }
    setDeleting(false);
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

  async function quickAddSingleLot() {
    if (!selectedSite || !quickLotNumber.trim()) return;
    setQuickAdding(true);
    await fetch("/api/lots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobsite_id: selectedSite,
        count: 1,
        from: parseInt(quickLotNumber) || undefined,
        custom_number: quickLotNumber.trim(),
      }),
    });
    setQuickLotNumber("");
    await loadLots(selectedSite);
    await loadSites();
    setQuickAdding(false);
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
        const ua = a.lot_number.split("-")[1] || "";
        const ub = b.lot_number.split("-")[1] || "";
        return ua.localeCompare(ub);
      });
    }

    return { singles, blocks: sortedBlocks, total: filtered.length };
  }

  // Block unit name helper
  function blockUnitName(i: number): string {
    return blockNaming === "letters"
      ? String.fromCharCode(65 + i)
      : String(i + 1);
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

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-text-muted font-medium mb-1">Site Name</label>
                  <input
                    type="text"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                    placeholder="Site name *"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-text-muted font-medium mb-1">Address</label>
                    <input
                      type="text"
                      value={siteAddress}
                      onChange={(e) => setSiteAddress(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                      placeholder="Address"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted font-medium mb-1">City</label>
                    <input
                      type="text"
                      value={siteCity}
                      onChange={(e) => setSiteCity(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                      placeholder="City"
                    />
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Add Lots — same as Site Settings */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-text">Add Lots</h3>

                {/* Mode tabs */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                  <button
                    type="button"
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
                    type="button"
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
                          value={singlesFrom || "1"}
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
                          value={singlesTo || "10"}
                          onChange={(e) => setSinglesTo(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                        />
                      </div>
                    </div>
                    {(() => {
                      const f = parseInt(singlesFrom || "1");
                      const t = parseInt(singlesTo || "10");
                      const cnt = !isNaN(f) && !isNaN(t) && t >= f ? t - f + 1 : 0;
                      return cnt > 0 ? (
                        <p className="text-xs text-text-muted">
                          Will create <strong>{cnt}</strong> lots: {f} to {t}
                        </p>
                      ) : null;
                    })()}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-text-muted font-medium mb-1">Block #</label>
                        <input
                          type="text"
                          value={blockNumber}
                          onChange={(e) => setBlockNumber(e.target.value)}
                          placeholder="e.g. 70, A, B"
                          className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-text-muted font-medium mb-1">Units</label>
                        <input
                          type="number"
                          min={1}
                          max={blockNaming === "letters" ? 26 : 99}
                          inputMode="numeric"
                          value={blockUnits}
                          onChange={(e) => setBlockUnits(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                        />
                      </div>
                    </div>
                    {/* Naming toggle */}
                    <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setBlockNaming("letters")}
                        className={`flex-1 py-1.5 rounded-md text-sm font-medium transition ${
                          blockNaming === "letters"
                            ? "bg-white text-brand shadow-sm"
                            : "text-text-muted hover:text-text"
                        }`}
                      >
                        A, B, C...
                      </button>
                      <button
                        type="button"
                        onClick={() => setBlockNaming("numbers")}
                        className={`flex-1 py-1.5 rounded-md text-sm font-medium transition ${
                          blockNaming === "numbers"
                            ? "bg-white text-brand shadow-sm"
                            : "text-text-muted hover:text-text"
                        }`}
                      >
                        1, 2, 3...
                      </button>
                    </div>
                    {blockNumber.trim() && parseInt(blockUnits) > 0 && (
                      <p className="text-xs text-text-muted">
                        Will create <strong>{blockUnits}</strong> lots:{" "}
                        {Array.from({ length: Math.min(parseInt(blockUnits) || 0, 8) }, (_, i) => `${blockNumber}-${blockUnitName(i)}`).join(", ")}
                        {(parseInt(blockUnits) || 0) > 8 && ", ..."}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Create button */}
              <button
                type="button"
                onClick={async (e) => {
                  // Create site first, then add lots
                  e.preventDefault();
                  if (!siteName.trim()) return;
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

                    // Add lots based on selected mode
                    if (addMode === "singles") {
                      const from = parseInt(singlesFrom || "1");
                      const to = parseInt(singlesTo || "10");
                      if (!isNaN(from) && !isNaN(to) && to >= from) {
                        await fetch("/api/lots", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ jobsite_id: site.id, count: to - from + 1, from }),
                        });
                      }
                    } else {
                      const bn = blockNumber.trim();
                      const units = parseInt(blockUnits);
                      if (bn && !isNaN(units) && units > 0) {
                        await fetch("/api/lots", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ jobsite_id: site.id, block_number: bn, unit_count: units, unit_naming: blockNaming }),
                        });
                      }
                    }

                    setSiteName("");
                    setSiteAddress("");
                    setSiteCity("");
                    setSelectedSite(site.id);
                    await loadSites();
                    await loadLots(site.id);
                  }
                  setCreatingSite(false);
                }}
                disabled={creatingSite || !siteName.trim()}
                className="w-full flex items-center justify-center gap-1.5 bg-brand text-white text-sm font-medium py-2.5 px-4 rounded-xl hover:bg-brand-dark active:scale-[0.98] transition disabled:opacity-50"
              >
                {creatingSite ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Plus size={16} />
                )}
                Create Site
              </button>
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
              <div className="space-y-2">
                <p className="text-xs text-text-muted">
                  Copy individual lot links and send to workers.
                </p>
                {/* Quick add single lot */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={quickLotNumber}
                    onChange={(e) => setQuickLotNumber(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && quickAddSingleLot()}
                    placeholder="Lot # (e.g. 45, B-3)"
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                  />
                  <button
                    onClick={quickAddSingleLot}
                    disabled={quickAdding || !quickLotNumber.trim()}
                    className="flex items-center gap-1 px-3 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark active:scale-[0.98] transition disabled:opacity-50"
                  >
                    {quickAdding ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Plus size={14} />
                    )}
                    Add
                  </button>
                </div>
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
                <div key={lot.id} className={`transition-all ${blockLinkMode ? "opacity-30 pointer-events-none" : ""}`}>
                <LotRow
                  lot={lot}
                  archiveSelected={archiveSelection.has(lot.id)}
                  copiedId={copiedId}
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
                  editing={editingLotId === lot.id}
                  editValue={editingLotId === lot.id ? editingLotValue : undefined}
                  saving={savingLot}
                  onEditStart={() => { setEditingLotId(lot.id); setEditingLotValue(lot.lot_number); }}
                  onEditChange={setEditingLotValue}
                  onEditSave={() => renameLot(lot.id, editingLotValue)}
                  onEditCancel={() => { setEditingLotId(null); setEditingLotValue(""); }}
                />
                </div>
              ))}

              {/* Blocks */}
              {blocks.map(([blockId, blockLots]) => {
                const isLinkMode = blockLinkMode === blockId;
                const isDimmed = blockLinkMode !== null && !isLinkMode;
                return (
                  <div
                    key={`block-${blockId}`}
                    className={`border rounded-lg overflow-hidden transition-all ${
                      isDimmed
                        ? "opacity-30 pointer-events-none border-border/50"
                        : isLinkMode
                        ? "border-brand ring-2 ring-brand/20"
                        : lotView === "archived"
                        ? "border-amber-200"
                        : "border-blue-200"
                    }`}
                  >
                    <div className={`px-3 py-1.5 flex items-center gap-1.5 ${
                      isLinkMode ? "bg-brand/10" : lotView === "archived" ? "bg-amber-50" : "bg-blue-50"
                    }`}>
                      <Building2 size={12} className={isLinkMode ? "text-brand" : lotView === "archived" ? "text-amber-600" : "text-blue-600"} />
                      <span className={`text-xs font-medium ${isLinkMode ? "text-brand" : lotView === "archived" ? "text-amber-700" : "text-blue-700"}`}>Block {blockId}</span>
                      <span className={`text-xs ${isLinkMode ? "text-brand/70" : lotView === "archived" ? "text-amber-500" : "text-blue-500"}`}>{blockLots.length} units</span>
                      {lotView !== "archived" && !isLinkMode && (
                        <button
                          onClick={() => startBlockLinkMode(blockId, blockLots)}
                          disabled={blockLinkMode !== null}
                          className={`ml-auto flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md transition ${
                            copiedId === `block-${blockId}`
                              ? "bg-green-50 text-green-600"
                              : "bg-brand/10 text-brand hover:bg-brand/20"
                          }`}
                        >
                          {copiedId === `block-${blockId}` ? (
                            <>
                              <Check size={10} />
                              Copied
                            </>
                          ) : (
                            <>
                              <Link2 size={10} />
                              Block Link
                            </>
                          )}
                        </button>
                      )}
                      {isLinkMode && (
                        <button
                          onClick={cancelBlockLinkMode}
                          className="ml-auto text-xs text-text-muted hover:text-text px-1.5 py-0.5 rounded-md hover:bg-gray-100 transition"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {/* Selection hint */}
                    {isLinkMode && (
                      <div className="px-3 py-1.5 bg-brand/5 border-b border-brand/10 text-[11px] text-brand font-medium">
                        Select units to include in the link:
                      </div>
                    )}

                    <div className="space-y-0.5 p-1">
                      {blockLots.map((lot) => {
                        if (isLinkMode) {
                          const selected = blockLinkSelection.has(lot.id);
                          return (
                            <button
                              key={lot.id}
                              type="button"
                              onClick={() => toggleBlockLinkLot(lot.id)}
                              className={`w-full flex items-center gap-3 p-2 rounded-lg border transition active:scale-[0.98] ${
                                selected
                                  ? "border-brand bg-brand/5"
                                  : "border-border/50 bg-gray-50/50 opacity-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                readOnly
                                className="w-4 h-4 rounded accent-[var(--color-brand,#0F766E)]"
                              />
                              <span className={`text-xs font-medium ${selected ? "text-text" : "text-text-muted"}`}>
                                Lot {lot.lot_number}
                              </span>
                            </button>
                          );
                        }

                        return (
                          <LotRow
                            key={lot.id}
                            lot={lot}
                            archiveSelected={archiveSelection.has(lot.id)}
                            copiedId={copiedId}
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
                            editing={editingLotId === lot.id}
                            editValue={editingLotId === lot.id ? editingLotValue : undefined}
                            saving={savingLot}
                            onEditStart={() => { setEditingLotId(lot.id); setEditingLotValue(lot.lot_number); }}
                            onEditChange={setEditingLotValue}
                            onEditSave={() => renameLot(lot.id, editingLotValue)}
                            onEditCancel={() => { setEditingLotId(null); setEditingLotValue(""); }}
                          />
                        );
                      })}
                    </div>

                    {/* Create link footer */}
                    {isLinkMode && (
                      <div className="px-3 py-2 bg-gray-50 border-t border-border flex items-center gap-2">
                        <button
                          onClick={cancelBlockLinkMode}
                          className="px-3 py-1.5 text-xs text-text-secondary bg-white border border-border rounded-lg hover:bg-gray-50 transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => createBlockLink(blockId)}
                          disabled={blockLinkSelection.size === 0 || blockLinkLoading}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand text-white hover:bg-brand-dark active:scale-[0.97] transition disabled:opacity-50"
                        >
                          {blockLinkLoading ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <>
                              <Link2 size={11} />
                              Create Link for {blockLinkSelection.size} unit{blockLinkSelection.size !== 1 ? "s" : ""}
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Section 3: Add Lots */}
        {selectedSite && (
          <section className="bg-card rounded-xl border border-border p-4 space-y-3">
            <h2 className="font-semibold text-text flex items-center gap-2">
              <Plus size={18} className="text-brand" />
              Add Lots
            </h2>

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
                      value={blockNumber}
                      onChange={(e) => setBlockNumber(e.target.value)}
                      placeholder="e.g. 70, A, B"
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted font-medium mb-1">Units</label>
                    <input
                      type="number"
                      min={1}
                      max={blockNaming === "letters" ? 26 : 99}
                      inputMode="numeric"
                      value={blockUnits}
                      onChange={(e) => setBlockUnits(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                    />
                  </div>
                </div>
                {/* Naming toggle */}
                <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setBlockNaming("letters")}
                    className={`flex-1 py-1.5 rounded-md text-sm font-medium transition ${
                      blockNaming === "letters"
                        ? "bg-white text-brand shadow-sm"
                        : "text-text-muted hover:text-text"
                    }`}
                  >
                    A, B, C...
                  </button>
                  <button
                    type="button"
                    onClick={() => setBlockNaming("numbers")}
                    className={`flex-1 py-1.5 rounded-md text-sm font-medium transition ${
                      blockNaming === "numbers"
                        ? "bg-white text-brand shadow-sm"
                        : "text-text-muted hover:text-text"
                    }`}
                  >
                    1, 2, 3...
                  </button>
                </div>
                {blockNumber.trim() && parseInt(blockUnits) > 0 && (
                  <p className="text-xs text-text-muted">
                    Will create <strong>{blockUnits}</strong> lots:{" "}
                    {Array.from({ length: Math.min(parseInt(blockUnits) || 0, 8) }, (_, i) => `${blockNumber}-${blockUnitName(i)}`).join(", ")}
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
          </section>
        )}

        {/* Section 3b: Site Settings — clickable link */}
        {selectedSite && (
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="w-full flex items-center gap-2 px-4 py-3 bg-card rounded-xl border border-border text-sm font-medium text-text-secondary hover:bg-gray-50 transition"
          >
            <Settings size={16} className="text-text-muted" />
            Site Settings
            <span className="ml-auto text-xs text-text-muted">{showSettings ? "▲" : "▼"}</span>
          </button>
        )}

        {/* Site Settings expanded */}
        {selectedSite && showSettings && (
          <section className="bg-card rounded-xl border border-border p-4 space-y-3">
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

            {/* Danger Zone inside settings */}
            <div className="border-t border-border pt-4 mt-4 space-y-3">
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
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function LotRow({
  lot,
  archiveSelected,
  copiedId,
  onArchiveToggle,
  onCopy,
  compact,
  isArchived,
  editing,
  editValue,
  saving,
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel,
}: {
  lot: Lot;
  archiveSelected: boolean;
  copiedId: string | null;
  onArchiveToggle: () => void;
  onCopy: () => void;
  compact?: boolean;
  isArchived?: boolean;
  editing?: boolean;
  editValue?: string;
  saving?: boolean;
  onEditStart?: () => void;
  onEditChange?: (v: string) => void;
  onEditSave?: () => void;
  onEditCancel?: () => void;
}) {
  const workers = lot.registered_workers ?? [];

  return (
    <div
      className={`flex items-center gap-3 ${compact ? "p-2" : "p-2.5"} rounded-lg border transition ${
        editing
          ? "border-brand bg-brand/5"
          : archiveSelected
            ? "border-amber-400 bg-amber-50 cursor-pointer"
            : isArchived
              ? "border-border/50 bg-gray-50/50 cursor-pointer"
              : "border-border hover:bg-gray-50 cursor-pointer"
      }`}
      onClick={editing ? undefined : onArchiveToggle}
    >
      {!editing && (
        <input
          type="checkbox"
          checked={archiveSelected}
          onChange={onArchiveToggle}
          onClick={(e) => e.stopPropagation()}
          className={`w-4 h-4 rounded border-border focus:ring-brand/30 ${
            archiveSelected ? "accent-amber-600" : "accent-[var(--color-brand,#0F766E)]"
          }`}
        />
      )}
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editValue ?? ""}
              onChange={(e) => onEditChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onEditSave?.();
                if (e.key === "Escape") onEditCancel?.();
              }}
              autoFocus
              className="flex-1 px-2 py-1 rounded-md border border-brand/30 bg-white text-sm text-text outline-none focus:ring-2 focus:ring-brand/30"
            />
            <button
              onClick={onEditSave}
              disabled={saving}
              className="p-1.5 bg-brand text-white rounded-md hover:bg-brand-dark transition disabled:opacity-50"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            </button>
            <button
              onClick={onEditCancel}
              className="p-1.5 text-text-muted hover:text-text rounded-md hover:bg-gray-100 transition"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <>
            <span className={`${compact ? "text-xs" : "text-sm"} font-medium ${isArchived ? "text-text-muted" : "text-text"}`}>
              Lot {lot.lot_number}
            </span>
            {workers.length > 0 && (
              <div className="text-[11px] text-text-muted truncate">
                {workers.join(", ")}
              </div>
            )}
          </>
        )}
      </div>
      {!editing && !isArchived && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditStart?.();
            }}
            className="p-1.5 text-text-muted hover:text-brand hover:bg-brand/10 rounded-md transition"
            title="Rename lot"
          >
            <Pencil size={12} />
          </button>
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
        </div>
      )}
    </div>
  );
}
