"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2, Package, Truck, Check, AlertTriangle,
  BarChart3, Home, Building2,
} from "lucide-react";

interface Site {
  id: string;
  name: string;
  total_lots: number;
}

interface RequestRow {
  id: string;
  status: string;
  urgency_level: string;
  material_name: string;
  lot: { lot_number: string } | null;
}

export default function SummaryPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);

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

  const loadRequests = useCallback(async (siteId: string) => {
    const res = await fetch(`/api/requests?site_id=${siteId}`);
    if (res.ok) {
      setRequests(await res.json());
    }
  }, []);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  useEffect(() => {
    if (selectedSite) loadRequests(selectedSite);
  }, [selectedSite, loadRequests]);

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
        <BarChart3 size={48} className="text-text-muted/30 mb-3" />
        <p className="text-sm text-text-muted">No sites yet. Create one in the Links tab.</p>
      </div>
    );
  }

  const site = sites.find((s) => s.id === selectedSite);

  const counts = {
    requested: requests.filter((r) => r.status === "requested" || r.status === "acknowledged").length,
    in_transit: requests.filter((r) => r.status === "in_transit").length,
    delivered: requests.filter((r) => r.status === "delivered").length,
    problem: requests.filter((r) => r.status === "problem").length,
    urgent: requests.filter((r) => r.urgency_level === "critical").length,
    total: requests.length,
  };

  const STATS = [
    { label: "Pending", value: counts.requested, icon: Package, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "In Transit", value: counts.in_transit, icon: Truck, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Delivered", value: counts.delivered, icon: Check, color: "text-green-600", bg: "bg-green-50" },
    { label: "Problems", value: counts.problem, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
  ];

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

        {/* Site header */}
        {site && (
          <div className="bg-card rounded-xl border border-border p-4">
            <h2 className="text-lg font-bold text-text">{site.name}</h2>
            <p className="text-sm text-text-muted mt-0.5">
              {site.total_lots} lots \u00b7 {counts.total} requests
            </p>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={`${stat.bg} rounded-xl p-4 border border-border/50`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={16} className={stat.color} />
                  <span className="text-xs font-medium text-text-secondary">{stat.label}</span>
                </div>
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              </div>
            );
          })}
        </div>

        {/* Urgent banner */}
        {counts.urgent > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500 shrink-0" />
            <span className="text-sm font-medium text-red-700">
              {counts.urgent} urgent request{counts.urgent !== 1 ? "s" : ""} pending
            </span>
          </div>
        )}

        {/* Recent requests */}
        {requests.length > 0 && (
          <section className="bg-card rounded-xl border border-border p-4 space-y-3">
            <h3 className="text-sm font-medium text-text">Recent Requests</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {requests.slice(0, 10).map((req) => (
                <div
                  key={req.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 bg-bg"
                >
                  <StatusDot status={req.status} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-text truncate block">
                      {req.material_name}
                    </span>
                    {req.lot && (
                      <span className="text-xs text-text-muted">
                        Lot {req.lot.lot_number}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    req.status === "delivered" ? "bg-green-100 text-green-700"
                    : req.status === "in_transit" ? "bg-blue-100 text-blue-700"
                    : req.status === "problem" ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-700"
                  }`}>
                    {req.status.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "delivered" ? "bg-green-500"
    : status === "in_transit" ? "bg-blue-500"
    : status === "problem" ? "bg-red-500"
    : "bg-amber-500";

  return <div className={`w-2 h-2 rounded-full shrink-0 ${color}`} />;
}
