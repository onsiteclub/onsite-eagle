"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, MapPin, Loader2, Check, Copy, Link2, Truck, Trash2, AlertTriangle } from "lucide-react";

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
  jobsite_id?: string;
}

export default function SetupPage() {
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  // Create site form
  const [siteName, setSiteName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [siteCity, setSiteCity] = useState("");
  const [creatingSite, setCreatingSite] = useState(false);

  // Lots
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [lotCount, setLotCount] = useState("10");
  const [createdLots, setCreatedLots] = useState<Lot[]>([]);
  const [allLots, setAllLots] = useState<Lot[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedSiteId, setCopiedSiteId] = useState<string | null>(null);

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
      setAllLots(data.filter((l) => l.jobsite_id === siteId));
    }
  }

  useEffect(() => {
    loadSites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedSite) loadLots(selectedSite);
  }, [selectedSite]);

  async function createSite(e: React.FormEvent) {
    e.preventDefault();
    if (!siteName.trim() || !lotCount) return;
    const count = parseInt(lotCount);
    if (count < 1 || count > 500) return;

    setCreatingSite(true);
    setCreatedLots([]);

    // 1. Create site
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

      // 2. Create lots
      const lotsRes = await fetch("/api/lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobsite_id: site.id, count }),
      });

      if (lotsRes.ok) {
        const lots = await lotsRes.json();
        setCreatedLots(lots);
      }

      setSiteName("");
      setSiteAddress("");
      setSiteCity("");
      setSelectedSite(site.id);
      await loadSites();
      await loadLots(site.id);
    }
    setCreatingSite(false);
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
        setCreatedLots([]);
      }
      setDeleteTarget(null);
      setDeleteConfirm("");
      await loadSites();
    }
    setDeleting(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-brand" />
      </div>
    );
  }

  return (
    <main className="pb-8">
      {/* Back */}
      <div className="px-4 pt-3">
        <button
          onClick={() => router.push("/supervisor")}
          className="flex items-center gap-1 text-sm text-text-secondary hover:text-text"
        >
          <ArrowLeft size={16} />
          Back to feed
        </button>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* Section 1: Create jobsite */}
        <section className="bg-card rounded-xl border border-border p-4 space-y-4">
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

          {/* Created lots feedback */}
          {createdLots.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <Check size={16} className="text-green-600" />
              <span className="text-sm text-green-700">
                {createdLots.length} lots created (Lot {createdLots[0].lot_number}
                {createdLots.length > 1 && ` — ${createdLots[createdLots.length - 1].lot_number}`})
              </span>
            </div>
          )}

          {/* Existing sites */}
          {sites.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-xs text-text-muted font-medium uppercase">Existing sites</p>
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
                        const msg = `Deliveries — ${site.name}\n${url}`;
                        navigator.clipboard.writeText(msg);
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

        {/* Section 2: Lot links for sharing */}
        {selectedSite && allLots.length > 0 && (
          <section className="bg-card rounded-xl border border-border p-4 space-y-3">
            <h2 className="font-semibold text-text flex items-center gap-2">
              <Link2 size={18} className="text-brand" />
              Lot Links
            </h2>
            <p className="text-xs text-text-muted">
              Share the link with the worker assigned to each lot.
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {allLots.map((lot) => (
                <div
                  key={lot.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-gray-50"
                >
                  <span className="text-sm font-medium text-text">Lot {lot.lot_number}</span>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/request/${lot.id}`;
                      const selectedSiteName = sites.find((s) => s.id === selectedSite)?.name ?? "";
                      const msg = `Material Requests — Lot ${lot.lot_number}${selectedSiteName ? `\n${selectedSiteName}` : ""}\n${url}`;
                      navigator.clipboard.writeText(msg);
                      setCopiedId(lot.id);
                      setTimeout(() => setCopiedId(null), 2000);
                    }}
                    className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition ${
                      copiedId === lot.id
                        ? "bg-green-50 text-green-600"
                        : "bg-brand/10 text-brand hover:bg-brand/20"
                    }`}
                  >
                    {copiedId === lot.id ? (
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
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 4: Danger Zone */}
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
