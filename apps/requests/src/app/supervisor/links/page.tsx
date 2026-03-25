"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2, Check, Copy, Link2,
  Truck, Home, Building2,
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
  jobsite_id?: string;
  status: string;
}

export default function LinksPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Generate lot link
  const [lotNumber, setLotNumber] = useState("");
  const [generatingLot, setGeneratingLot] = useState(false);

  // Generate block link
  const [blockNumber, setBlockNumber] = useState("");
  const [blockUnits, setBlockUnits] = useState("4");
  const [generatingBlock, setGeneratingBlock] = useState(false);

  // Copied feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Existing lots cache (to check if lot exists before creating)
  const [existingLots, setExistingLots] = useState<Lot[]>([]);

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
      setExistingLots(data.filter((l) => l.jobsite_id === siteId && l.status !== "archived"));
    }
  }, []);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  useEffect(() => {
    if (selectedSite) loadLots(selectedSite);
  }, [selectedSite, loadLots]);

  function showCopied(key: string) {
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  function copyOperatorLink() {
    if (!selectedSite) return;
    const url = `${window.location.origin}/operator/${selectedSite}`;
    navigator.clipboard.writeText(url);
    showCopied("operator");
  }

  async function generateLotLink() {
    if (!selectedSite || !lotNumber.trim()) return;
    setGeneratingLot(true);

    const num = lotNumber.trim();

    // Check if lot already exists
    let lot = existingLots.find(
      (l) => l.lot_number === num && l.jobsite_id === selectedSite
    );

    if (!lot) {
      // Create the lot on the fly
      const res = await fetch("/api/lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobsite_id: selectedSite,
          custom_number: num,
          count: 1,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        if (Array.isArray(created) && created.length > 0) {
          lot = created[0];
        }
        await loadLots(selectedSite);
        await loadSites();
      }
    }

    if (lot) {
      const url = `${window.location.origin}/request/${lot.id}`;
      await navigator.clipboard.writeText(url);
      showCopied("lot");
      setLotNumber("");
    }

    setGeneratingLot(false);
  }

  async function generateBlockLink() {
    if (!selectedSite || !blockNumber.trim() || !parseInt(blockUnits)) return;
    setGeneratingBlock(true);

    const bn = blockNumber.trim();
    const units = parseInt(blockUnits);

    // Check if block lots already exist
    const existingBlockLots = existingLots.filter((l) => l.block === bn);

    if (existingBlockLots.length === 0) {
      // Create block lots on the fly
      await fetch("/api/lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobsite_id: selectedSite,
          block_number: bn,
          unit_count: units,
        }),
      });
      await loadLots(selectedSite);
      await loadSites();
    }

    // Reload lots to get IDs
    const lotsRes = await fetch("/api/lots");
    if (lotsRes.ok) {
      const allLots: Lot[] = await lotsRes.json();
      const blockLots = allLots.filter(
        (l) => l.block === bn && l.jobsite_id === selectedSite && l.status !== "archived"
      );

      if (blockLots.length > 0) {
        // Create bundle
        const bundleRes = await fetch("/api/bundles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobsite_id: selectedSite,
            label: `Block ${bn}`,
            lot_ids: blockLots.map((l) => l.id),
          }),
        });

        if (bundleRes.ok) {
          const bundle = await bundleRes.json();
          const url = `${window.location.origin}/bundle/${bundle.id}`;
          await navigator.clipboard.writeText(url);
          showCopied("block");
          setBlockNumber("");
        }
      }
    }

    setGeneratingBlock(false);
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
      <div className="px-4 py-4 space-y-4">

        {/* Site selector */}
        {sites.length > 0 ? (
          <div className="flex gap-2 flex-wrap">
            {sites.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSite(s.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  selectedSite === s.id
                    ? "bg-brand text-white"
                    : "bg-gray-100 text-text-secondary hover:bg-gray-200"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <p className="text-sm text-text-muted">No sites yet. Create one in Settings.</p>
          </div>
        )}

        {/* Link generators — only when site is selected */}
        {selectedSite && (
          <>
            {/* Operator Link */}
            <section className="bg-card rounded-xl border border-border p-4">
              <button
                onClick={copyOperatorLink}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition active:scale-[0.98] ${
                  copiedKey === "operator"
                    ? "bg-green-50 text-green-600 border border-green-200"
                    : "bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100"
                }`}
              >
                {copiedKey === "operator" ? (
                  <>
                    <Check size={16} />
                    Operator Link Copied!
                  </>
                ) : (
                  <>
                    <Truck size={16} />
                    Copy Operator Link
                  </>
                )}
              </button>
            </section>

            {/* Lot Link */}
            <section className="bg-card rounded-xl border border-border p-4 space-y-3">
              <h3 className="text-sm font-medium text-text flex items-center gap-1.5">
                <Home size={14} className="text-brand" />
                Lot Link
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && generateLotLink()}
                  placeholder="Lot # (e.g. 105)"
                  className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
                <button
                  onClick={generateLotLink}
                  disabled={generatingLot || !lotNumber.trim()}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition active:scale-[0.98] disabled:opacity-50 ${
                    copiedKey === "lot"
                      ? "bg-green-500 text-white"
                      : "bg-brand text-white hover:bg-brand-dark"
                  }`}
                >
                  {generatingLot ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : copiedKey === "lot" ? (
                    <>
                      <Check size={14} />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      Copy Link
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-text-muted">
                Creates the lot automatically if it doesn&apos;t exist.
              </p>
            </section>

            {/* Block Link */}
            <section className="bg-card rounded-xl border border-border p-4 space-y-3">
              <h3 className="text-sm font-medium text-text flex items-center gap-1.5">
                <Building2 size={14} className="text-brand" />
                Block Link
              </h3>
              <div className="grid grid-cols-[1fr_80px] gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={blockNumber}
                  onChange={(e) => setBlockNumber(e.target.value)}
                  placeholder="Block # (e.g. 70)"
                  className="px-3 py-2.5 rounded-xl border border-border bg-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={26}
                    inputMode="numeric"
                    value={blockUnits}
                    onChange={(e) => setBlockUnits(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-text-muted pointer-events-none">units</span>
                </div>
              </div>
              {blockNumber.trim() && parseInt(blockUnits) > 0 && (
                <p className="text-xs text-text-muted">
                  {Array.from(
                    { length: Math.min(parseInt(blockUnits) || 0, 8) },
                    (_, i) => `${blockNumber}-${String.fromCharCode(65 + i)}`
                  ).join(", ")}
                  {(parseInt(blockUnits) || 0) > 8 && ", ..."}
                </p>
              )}
              <button
                onClick={generateBlockLink}
                disabled={generatingBlock || !blockNumber.trim() || !parseInt(blockUnits)}
                className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition active:scale-[0.98] disabled:opacity-50 ${
                  copiedKey === "block"
                    ? "bg-green-500 text-white"
                    : "bg-brand text-white hover:bg-brand-dark"
                }`}
              >
                {generatingBlock ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : copiedKey === "block" ? (
                  <>
                    <Check size={14} />
                    Block Link Copied!
                  </>
                ) : (
                  <>
                    <Link2 size={14} />
                    Generate Block Link
                  </>
                )}
              </button>
              <p className="text-[11px] text-text-muted">
                Creates block lots (A, B, C...) and generates a single shared link.
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
