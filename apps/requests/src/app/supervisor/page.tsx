"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TransactionCard } from "@/components/TransactionCard";
import { RefreshCw, Loader2, Settings, Inbox } from "lucide-react";

interface MaterialRequest {
  id: string;
  material_name: string;
  quantity: number;
  unit: string;
  status: string;
  urgency_level: string;
  requested_at: string;
  requested_by_name: string | null;
  delivered_by_name: string | null;
  delivery_notes: string | null;
  in_transit_at: string | null;
  delivered_at: string | null;
  notes: string | null;
  urgency_reason: string | null;
  lot: { lot_number: string } | null;
  jobsite: { name: string } | null;
}

type Filter = "all" | "pending" | "delivered";

const POLL_INTERVAL = 4000;

export default function SupervisorPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [siteCount, setSiteCount] = useState(0);

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
    }
  }, []);

  useEffect(() => {
    loadData().then(() => setLoading(false));
  }, [loadData]);

  // Polling
  useEffect(() => {
    const interval = setInterval(loadData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [loadData]);

  const filtered = requests.filter((r) => {
    if (filter === "pending") return ["requested", "acknowledged", "in_transit"].includes(r.status);
    if (filter === "delivered") return r.status === "delivered";
    return true;
  });

  const pendingCount = requests.filter((r) =>
    ["requested", "acknowledged", "in_transit"].includes(r.status)
  ).length;
  const deliveredCount = requests.filter((r) => r.status === "delivered").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-brand" />
      </div>
    );
  }

  return (
    <main className="pb-8">
      {/* Setup bar */}
      <div className="flex items-center justify-between px-4 pt-3">
        <button
          onClick={() => router.push("/supervisor/setup")}
          className="flex items-center gap-1.5 text-sm text-brand font-medium hover:underline"
        >
          <Settings size={14} />
          Setup
          {siteCount > 0 && (
            <span className="bg-brand/10 text-brand text-xs px-1.5 py-0.5 rounded-full">
              {siteCount} site{siteCount !== 1 ? "s" : ""}
            </span>
          )}
        </button>

        <div className="flex items-center gap-1.5">
          <RefreshCw size={12} className="text-brand animate-spin" style={{ animationDuration: "3s" }} />
          <span className="text-xs text-text-muted">4s</span>
        </div>
      </div>

      {/* Stats + filters */}
      <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto">
        <FilterChip
          label={`All (${requests.length})`}
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
          filtered.map((req) => <TransactionCard key={req.id} request={req} />)
        )}
      </div>
    </main>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${
        active
          ? "bg-brand text-white"
          : "bg-card text-text-secondary border border-border hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}
