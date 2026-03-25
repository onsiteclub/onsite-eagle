"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCookie } from "@/lib/cookies";
import { Loader2, AlertTriangle, HardHat, Package, ArrowRight } from "lucide-react";

interface BundleLot {
  id: string;
  lot_number: string;
}

interface BundleData {
  id: string;
  label: string | null;
  site: { id: string; name: string; machine_down?: boolean; machine_down_reason?: string | null };
  lots: BundleLot[];
}

export default function BundlePage() {
  const { bundleId } = useParams<{ bundleId: string }>();
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [bundle, setBundle] = useState<BundleData | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadBundle = useCallback(async () => {
    const res = await fetch(`/api/bundles/${bundleId}`);
    if (!res.ok) {
      setError(true);
      return;
    }
    const data = await res.json();
    setBundle(data);
  }, [bundleId]);

  useEffect(() => {
    const name = getCookie("onsite-name");
    if (name) setUserName(name);

    async function init() {
      await loadBundle();
      setLoading(false);
    }
    init();
  }, [loadBundle]);

  // Poll for machine_down changes
  useEffect(() => {
    if (!userName) return;
    const interval = setInterval(loadBundle, 5000);
    return () => clearInterval(interval);
  }, [loadBundle, userName]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const name = nameInput.trim();
    if (!name) return;
    document.cookie = `onsite-name=${encodeURIComponent(name)};path=/;max-age=${30 * 24 * 60 * 60}`;
    document.cookie = `onsite-role=worker;path=/;max-age=${30 * 24 * 60 * 60}`;
    setUserName(name);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-brand" />
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <AlertTriangle size={48} className="text-yellow-500 mb-3" />
        <h2 className="text-lg font-semibold text-text">Bundle not found</h2>
        <p className="text-sm text-text-muted mt-1">
          Check the link with your supervisor.
        </p>
      </div>
    );
  }

  // Inline login
  if (!userName) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center px-6 bg-bg">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-brand rounded-2xl flex items-center justify-center mb-4">
              <HardHat size={32} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-text">{bundle.site.name}</h1>
            {bundle.label && (
              <p className="text-sm text-text-secondary mt-1">{bundle.label}</p>
            )}
            <p className="text-xs text-text-muted mt-2">
              {bundle.lots.length} lot{bundle.lots.length !== 1 ? "s" : ""} assigned
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="bg-card rounded-2xl p-6 shadow-sm border border-border space-y-5"
          >
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-text mb-1">
                Your name
              </label>
              <input
                id="name"
                type="text"
                autoCapitalize="words"
                autoComplete="name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && nameInput.trim()) handleLogin(e);
                }}
                className="w-full px-3 py-3 rounded-xl border border-border bg-bg text-text text-base outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
                placeholder="e.g. John Smith"
              />
            </div>
            <button
              type="submit"
              disabled={!nameInput.trim()}
              className="w-full flex items-center justify-center gap-2 bg-brand text-white font-medium py-3.5 px-4 rounded-xl hover:bg-brand-dark active:scale-[0.98] transition disabled:opacity-40"
            >
              <Package size={20} />
              Enter
            </button>
          </form>
        </div>
      </main>
    );
  }

  // Group lots from the same block into a single entry
  function groupLots(lots: BundleLot[]) {
    // Check if all lots share a common block prefix (e.g. "70-1", "70-2" → block "70")
    const parsed = lots.map((lot) => {
      const dashIdx = lot.lot_number.lastIndexOf("-");
      if (dashIdx > 0) {
        return { ...lot, block: lot.lot_number.slice(0, dashIdx), unit: lot.lot_number.slice(dashIdx + 1) };
      }
      return { ...lot, block: null, unit: lot.lot_number };
    });

    const blocks = new Map<string, typeof parsed>();
    const singles: typeof parsed = [];

    for (const p of parsed) {
      if (p.block) {
        if (!blocks.has(p.block)) blocks.set(p.block, []);
        blocks.get(p.block)!.push(p);
      } else {
        singles.push(p);
      }
    }

    const groups: { label: string; lotIds: string[]; primaryLotId: string }[] = [];

    for (const [block, items] of blocks) {
      if (items.length > 1) {
        const units = items.map((i) => i.unit).join("/");
        groups.push({
          label: `Lot ${block}-${units}`,
          lotIds: items.map((i) => i.id),
          primaryLotId: items[0].id,
        });
      } else {
        groups.push({
          label: `Lot ${items[0].lot_number}`,
          lotIds: [items[0].id],
          primaryLotId: items[0].id,
        });
      }
    }

    for (const s of singles) {
      groups.push({
        label: `Lot ${s.lot_number}`,
        lotIds: [s.id],
        primaryLotId: s.id,
      });
    }

    return groups;
  }

  const lotGroups = groupLots(bundle.lots);

  const isMachineDown = bundle.site.machine_down === true;

  // Lot cards
  return (
    <main className="pb-8">
      {/* Machine Down banner */}
      {isMachineDown && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white">
          <AlertTriangle size={16} className="shrink-0" />
          <span className="text-sm font-semibold">Machine Down</span>
          {bundle.site.machine_down_reason && (
            <span className="text-sm text-white/80 truncate">— {bundle.site.machine_down_reason}</span>
          )}
        </div>
      )}

      <div className="bg-brand text-white px-4 py-4">
        <h1 className="text-lg font-bold">{bundle.site.name}</h1>
        <p className="text-sm text-white/80">
          {bundle.label ? `${bundle.label} — ` : ""}
          {bundle.lots.length} lot{bundle.lots.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="px-4 py-4 space-y-3">
        <p className="text-sm text-text-secondary">
          Tap to view or create material requests.
        </p>

        <div className="grid gap-3">
          {lotGroups.map((group) => (
            <button
              key={group.primaryLotId}
              onClick={() => router.push(`/request/${group.primaryLotId}`)}
              className="flex items-center justify-between p-4 bg-card rounded-xl border border-border hover:border-brand hover:bg-brand/5 active:scale-[0.98] transition text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand/10 rounded-lg flex items-center justify-center">
                  <Package size={20} className="text-brand" />
                </div>
                <div>
                  <div className="text-base font-semibold text-text">
                    {group.label}
                  </div>
                  <div className="text-xs text-text-muted">
                    Material requests{group.lotIds.length > 1 ? ` · ${group.lotIds.length} units` : ""}
                  </div>
                </div>
              </div>
              <ArrowRight size={18} className="text-text-muted" />
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
