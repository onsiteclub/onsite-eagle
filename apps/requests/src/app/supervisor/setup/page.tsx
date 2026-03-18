"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, MapPin, Loader2, Check } from "lucide-react";

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

  // Create lots
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [lotCount, setLotCount] = useState("10");
  const [creatingLots, setCreatingLots] = useState(false);
  const [createdLots, setCreatedLots] = useState<Lot[]>([]);

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

  useEffect(() => {
    loadSites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createSite(e: React.FormEvent) {
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
      setSiteName("");
      setSiteAddress("");
      setSiteCity("");
      setSelectedSite(site.id);
      await loadSites();
    }
    setCreatingSite(false);
  }

  async function createLots() {
    if (!selectedSite || !lotCount) return;
    const count = parseInt(lotCount);
    if (count < 1 || count > 500) return;

    setCreatingLots(true);
    setCreatedLots([]);

    const res = await fetch("/api/lots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobsite_id: selectedSite, count }),
    });

    if (res.ok) {
      const lots = await res.json();
      setCreatedLots(lots);
      await loadSites();
    }
    setCreatingLots(false);
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
          Voltar ao feed
        </button>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* Section 1: Create jobsite */}
        <section className="bg-card rounded-xl border border-border p-4 space-y-4">
          <h2 className="font-semibold text-text flex items-center gap-2">
            <MapPin size={18} className="text-brand" />
            Criar Site
          </h2>

          <form onSubmit={createSite} className="space-y-3">
            <input
              type="text"
              required
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              placeholder="Nome do site *"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={siteAddress}
                onChange={(e) => setSiteAddress(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                placeholder="Endereço"
              />
              <input
                type="text"
                value={siteCity}
                onChange={(e) => setSiteCity(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                placeholder="Cidade"
              />
            </div>
            <button
              type="submit"
              disabled={creatingSite || !siteName.trim()}
              className="flex items-center justify-center gap-1.5 bg-brand text-white text-sm font-medium py-2.5 px-4 rounded-xl hover:bg-brand-dark active:scale-[0.98] transition disabled:opacity-50"
            >
              {creatingSite ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              Criar Site
            </button>
          </form>

          {/* Existing sites */}
          {sites.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-xs text-text-muted font-medium uppercase">Sites existentes</p>
              {sites.map((site) => (
                <div
                  key={site.id}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${
                    selectedSite === site.id
                      ? "border-brand bg-brand/5"
                      : "border-border hover:bg-gray-50"
                  }`}
                  onClick={() => setSelectedSite(site.id)}
                >
                  <div>
                    <div className="text-sm font-medium text-text">{site.name}</div>
                    {(site.city || site.address) && (
                      <div className="text-xs text-text-muted">
                        {[site.address, site.city].filter(Boolean).join(", ")}
                      </div>
                    )}
                  </div>
                  <span className="text-xs bg-gray-100 text-text-secondary px-2 py-0.5 rounded-full">
                    {site.total_lots} lotes
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 2: Create lots (only if site selected) */}
        {selectedSite && (
          <section className="bg-card rounded-xl border border-border p-4 space-y-4">
            <h2 className="font-semibold text-text flex items-center gap-2">
              <Plus size={18} className="text-brand" />
              Criar Lotes
            </h2>

            <p className="text-sm text-text-secondary">
              Site: <strong>{sites.find((s) => s.id === selectedSite)?.name}</strong>
            </p>

            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs text-text-secondary mb-1">Quantidade</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  inputMode="numeric"
                  value={lotCount}
                  onChange={(e) => setLotCount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-text text-sm outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
              <button
                onClick={createLots}
                disabled={creatingLots || !lotCount || parseInt(lotCount) < 1}
                className="flex items-center justify-center gap-1.5 bg-brand text-white text-sm font-medium py-2.5 px-4 rounded-xl hover:bg-brand-dark active:scale-[0.98] transition disabled:opacity-50"
              >
                {creatingLots ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Plus size={16} />
                )}
                Criar {lotCount || 0} lotes
              </button>
            </div>

            {/* Created lots feedback */}
            {createdLots.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <Check size={16} className="text-green-600" />
                <span className="text-sm text-green-700">
                  {createdLots.length} lotes criados (Lot {createdLots[0].lot_number}
                  {createdLots.length > 1 && ` — ${createdLots[createdLots.length - 1].lot_number}`})
                </span>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
