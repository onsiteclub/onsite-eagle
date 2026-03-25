"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCookie } from "@/lib/cookies";
import { TransactionCard } from "@/components/TransactionCard";
import { NewRequestModal } from "@/components/NewRequestModal";
import { RefreshCw, Loader2, Inbox, AlertTriangle, Fuel } from "lucide-react";

interface MaterialRequest {
  id: string;
  lot_id?: string;
  material_name: string;
  quantity: number;
  unit: string;
  status: string;
  urgency_level: string;
  requested_at: string;
  requested_by_name: string | null;
  delivered_by_name: string | null;
  delivery_notes: string | null;
  photo_url: string | null;
  in_transit_at: string | null;
  delivered_at: string | null;
  notes: string | null;
  urgency_reason: string | null;
  sub_items: { name: string; status: string }[] | null;
  lot: { lot_number: string } | null;
  jobsite: { name: string } | null;
}

interface SiteAlert {
  id: string;
  name: string;
  machine_down?: boolean;
  machine_down_reason?: string | null;
  refuel_needed?: boolean;
}

type Filter = "all" | "pending" | "delivered" | "problem" | "missing";

const POLL_INTERVAL = 4000;

export default function SupervisorPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [siteCount, setSiteCount] = useState(0);
  const [siteAlerts, setSiteAlerts] = useState<SiteAlert[]>([]);
  const [userName, setUserName] = useState("Supervisor");
  const [modalLot, setModalLot] = useState<{ id: string; label: string } | null>(null);

  const loadData = useCallback(async () => {
    const [reqRes, siteRes] = await Promise.all([
      fetch("/api/requests"),
      fetch("/api/sites"),
    ]);

    if (reqRes.ok) {
      const data = await reqRes.json();
      setRequests(data);
    }
    if (siteRes.ok) {
      const sites = await siteRes.json();
      setSiteCount(sites.length);
      setSiteAlerts(
        sites.filter((s: SiteAlert) => s.machine_down || s.refuel_needed)
      );
    }
  }, []);

  useEffect(() => {
    setUserName(getCookie("onsite-name") ?? "Supervisor");
    loadData().then(() => setLoading(false));
  }, [loadData]);

  // Polling
  useEffect(() => {
    const interval = setInterval(loadData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [loadData]);

  const hasMissing = (r: MaterialRequest) =>
    r.sub_items?.some((i) => i.status === "missing") ?? false;

  // "Active" = everything that needs attention (excludes clean delivered)
  const isActive = (r: MaterialRequest) => r.status !== "delivered";

  const filtered = requests
    .filter((r) => {
      if (filter === "pending") return ["requested", "acknowledged", "in_transit"].includes(r.status);
      if (filter === "delivered") return r.status === "delivered";
      if (filter === "problem") return r.status === "problem";
      if (filter === "missing") return hasMissing(r);
      // "all" = active only (no clean delivered)
      return isActive(r);
    })
    .sort((a, b) => {
      // in_transit always first
      if (a.status === "in_transit" && b.status !== "in_transit") return -1;
      if (b.status === "in_transit" && a.status !== "in_transit") return 1;
      return 0;
    });

  const activeCount = requests.filter(isActive).length;
  const pendingCount = requests.filter((r) =>
    ["requested", "acknowledged", "in_transit"].includes(r.status)
  ).length;
  const deliveredCount = requests.filter((r) => r.status === "delivered").length;
  const problemCount = requests.filter((r) => r.status === "problem").length;
  const missingCount = requests.filter(hasMissing).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-brand" />
      </div>
    );
  }

  return (
    <main className="pb-8">
      {/* Site alert banners */}
      {siteAlerts.map((site) => (
        <div key={site.id} className="space-y-0">
          {site.machine_down && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-black text-white">
              <AlertTriangle size={16} className="text-amber-400 shrink-0" />
              <span className="text-sm font-bold">MACHINE DOWN</span>
              <span className="text-sm text-white/60">—</span>
              <span className="text-sm text-white/80 truncate">{site.name}</span>
              {site.machine_down_reason && (
                <span className="text-sm text-white/50 truncate ml-auto">{site.machine_down_reason}</span>
              )}
            </div>
          )}
          {site.refuel_needed && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white">
              <Fuel size={16} className="shrink-0" />
              <span className="text-sm font-bold">REFUEL NEEDED</span>
              <span className="text-sm text-white/60">—</span>
              <span className="text-sm text-white/80 truncate">{site.name}</span>
            </div>
          )}
        </div>
      ))}

      {/* Priority action cards — always visible */}
      <div className="grid grid-cols-2 gap-2 px-4 pt-3">
        <button
          onClick={() => setFilter(filter === "missing" ? "all" : "missing")}
          className={`relative flex flex-col items-start p-3 rounded-xl border-2 transition active:scale-[0.97] ${
            filter === "missing"
              ? "bg-amber-50 border-amber-400 shadow-sm"
              : "bg-card border-border hover:border-amber-300"
          }`}
        >
          <span className={`text-2xl font-bold ${missingCount > 0 ? "text-amber-600" : "text-text-muted"}`}>
            {missingCount}
          </span>
          <span className="text-sm font-medium text-text-secondary mt-0.5">Missing</span>
          {missingCount > 0 && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
          )}
        </button>
        <button
          onClick={() => setFilter(filter === "problem" ? "all" : "problem")}
          className={`relative flex flex-col items-start p-3 rounded-xl border-2 transition active:scale-[0.97] ${
            filter === "problem"
              ? "bg-red-50 border-red-400 shadow-sm"
              : "bg-card border-border hover:border-red-300"
          }`}
        >
          <span className={`text-2xl font-bold ${problemCount > 0 ? "text-red-600" : "text-text-muted"}`}>
            {problemCount}
          </span>
          <span className="text-sm font-medium text-text-secondary mt-0.5">Problem</span>
          {problemCount > 0 && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
          )}
        </button>
      </div>

      {/* Secondary filters + live indicator */}
      <div className="flex items-center px-4 pt-2 pb-1">
        <div className="flex items-center gap-1.5 flex-1">
          <FilterChip
            label={`Active (${activeCount})`}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
          <FilterChip
            label={`Pending (${pendingCount})`}
            active={filter === "pending"}
            onClick={() => setFilter("pending")}
          />
          <FilterChip
            label={`Delivered (${deliveredCount})`}
            active={filter === "delivered"}
            onClick={() => setFilter("delivered")}
          />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <RefreshCw size={12} className="text-brand animate-spin" style={{ animationDuration: "3s" }} />
          <span className="text-sm text-text-muted">4s</span>
        </div>
      </div>

      {/* Feed */}
      <div className="px-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-text-muted">
            <Inbox size={48} className="mb-3" />
            <p className="text-base font-medium">No requests</p>
            {siteCount === 0 && (
              <button
                onClick={() => router.push("/supervisor/setup")}
                className="mt-3 text-sm text-brand font-medium hover:underline"
              >
                Create first site →
              </button>
            )}
          </div>
        ) : (
          filtered.map((req) => (
            <TransactionCard
              key={req.id}
              request={req}
              onUpdate={loadData}
              onNewRequest={(lotId, lotLabel) => setModalLot({ id: lotId, label: lotLabel })}
              supervisorName={userName}
            />
          ))
        )}
      </div>

      {/* New request modal */}
      {modalLot && (
        <NewRequestModal
          lotId={modalLot.id}
          lotLabel={modalLot.label}
          userName={userName}
          onClose={() => setModalLot(null)}
          onCreated={loadData}
        />
      )}
    </main>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  variant,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  variant?: "problem" | "missing";
}) {
  const activeClass =
    variant === "problem"
      ? "bg-red-600 text-white"
      : variant === "missing"
        ? "bg-amber-500 text-white"
        : "bg-brand text-white";

  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-2 rounded-full text-sm font-medium transition ${
        active
          ? activeClass
          : "bg-card text-text-secondary border border-border hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}
