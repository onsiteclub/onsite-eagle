"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { getCookie } from "@/lib/cookies";
import { QueueCard } from "@/components/QueueCard";
import { RefreshCw, Loader2, CheckCircle, AlertTriangle, Clock, Package } from "lucide-react";

interface SiteInfo {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  total_lots: number;
}

interface MaterialRequest {
  id: string;
  material_name: string;
  quantity: number;
  unit: string;
  status: string;
  urgency_level: string;
  urgency_score: number;
  requested_at: string;
  in_transit_at: string | null;
  delivered_at: string | null;
  requested_by_name: string | null;
  notes: string | null;
  urgency_reason: string | null;
  sub_items: { name: string; status: string }[] | null;
  lot: { lot_number: string; address: string | null } | null;
  jobsite: { name: string } | null;
}

const POLL_INTERVAL = 4000;

export default function SiteOperatorPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const [userName, setUserName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [siteInfo, setSiteInfo] = useState<SiteInfo | null>(null);
  const [siteError, setSiteError] = useState(false);
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [delivered, setDelivered] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [tab, setTab] = useState<"queue" | "delivered">("queue");

  // Load site details
  const loadSite = useCallback(async () => {
    const res = await fetch(`/api/sites/${siteId}`);
    if (!res.ok) {
      setSiteError(true);
      return null;
    }
    const data = await res.json();
    setSiteInfo(data);
    return data;
  }, [siteId]);

  // Load requests for this site only
  const loadQueue = useCallback(async () => {
    const [queueRes, deliveredRes] = await Promise.all([
      fetch(`/api/requests?site_id=${siteId}&status=requested,acknowledged,in_transit,problem`),
      fetch(`/api/requests?site_id=${siteId}&status=delivered`),
    ]);

    if (queueRes.ok) {
      const data = await queueRes.json();
      // Sort: in_transit first, then urgency desc, then oldest first
      data.sort((a: MaterialRequest, b: MaterialRequest) => {
        if (a.status === "in_transit" && b.status !== "in_transit") return -1;
        if (b.status === "in_transit" && a.status !== "in_transit") return 1;
        if (a.status === "problem" && b.status !== "problem") return -1;
        if (b.status === "problem" && a.status !== "problem") return 1;
        const urgencyOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        const ua = urgencyOrder[a.urgency_level] ?? 2;
        const ub = urgencyOrder[b.urgency_level] ?? 2;
        if (ua !== ub) return ub - ua;
        return new Date(a.requested_at).getTime() - new Date(b.requested_at).getTime();
      });
      setRequests(data);
    }

    if (deliveredRes.ok) {
      const data = await deliveredRes.json();
      // Most recent deliveries first
      data.sort((a: MaterialRequest, b: MaterialRequest) =>
        new Date(b.delivered_at ?? b.requested_at).getTime() - new Date(a.delivered_at ?? a.requested_at).getTime()
      );
      setDelivered(data);
    }
  }, [siteId]);

  useEffect(() => {
    const name = getCookie("onsite-name");
    if (name) setUserName(name);

    async function init() {
      await loadSite();
      await loadQueue();
      setLoading(false);
    }
    init();
  }, [loadSite, loadQueue]);

  // Polling
  useEffect(() => {
    if (!userName) return;
    const interval = setInterval(loadQueue, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [loadQueue, userName]);

  // Set page title
  useEffect(() => {
    if (siteInfo?.name) {
      document.title = `Deliveries — ${siteInfo.name}`;
    }
  }, [siteInfo?.name]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const name = nameInput.trim();
    if (!name) return;
    document.cookie = `onsite-name=${encodeURIComponent(name)};path=/;max-age=${30 * 24 * 60 * 60}`;
    document.cookie = `onsite-role=operator;path=/;max-age=${30 * 24 * 60 * 60}`;
    setUserName(name);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-brand" />
      </div>
    );
  }

  // Site not found
  if (siteError || !siteInfo) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <AlertTriangle size={48} className="text-yellow-500 mb-3" />
        <h2 className="text-lg font-semibold text-text">Site not found</h2>
        <p className="text-sm text-text-muted mt-1">
          Check the link with your supervisor.
        </p>
      </div>
    );
  }

  // Login inline
  if (!userName) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-brand/10 text-brand px-3 py-1.5 rounded-full text-sm font-medium mb-4">
              {siteInfo.name}
            </div>
            <h2 className="text-xl font-bold text-text">Deliveries</h2>
            <p className="text-sm text-text-muted mt-1">Enter your name to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="text"
              required
              autoFocus
              autoCapitalize="words"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3 rounded-xl border border-border bg-bg text-text text-base outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-center"
            />
            <button
              type="submit"
              disabled={!nameInput.trim()}
              className="w-full bg-brand text-white font-medium py-3 px-4 rounded-xl hover:bg-brand-dark active:scale-[0.98] transition disabled:opacity-50"
            >
              Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Logged in — show delivery queue for this site
  const pendingCount = requests.filter(
    (r) => r.status === "requested" || r.status === "acknowledged"
  ).length;
  const problemCount = requests.filter((r) => r.status === "problem").length;
  const transitCount = requests.filter((r) => r.status === "in_transit").length;

  return (
    <main className="pb-8">
      {/* Site info bar */}
      <div className="flex items-center justify-between px-4 pt-3">
        <div className="flex items-center gap-2">
          <span className="bg-brand/10 text-brand text-xs font-medium px-2 py-1 rounded-full">
            {siteInfo.name}
          </span>
          {siteInfo.city && <span className="text-xs text-text-muted">{siteInfo.city}</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <RefreshCw size={12} className="text-brand animate-spin" style={{ animationDuration: "3s" }} />
          <span className="text-xs text-text-muted">4s</span>
        </div>
      </div>

      {/* Tabs: Queue / Delivered */}
      <div className="flex items-center gap-2 px-4 pt-2 pb-1">
        <button
          onClick={() => setTab("queue")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
            tab === "queue"
              ? "bg-brand text-white"
              : "bg-card text-text-secondary border border-border hover:bg-gray-50"
          }`}
        >
          Queue ({requests.length})
        </button>
        <button
          onClick={() => setTab("delivered")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
            tab === "delivered"
              ? "bg-green-600 text-white"
              : "bg-card text-text-secondary border border-border hover:bg-gray-50"
          }`}
        >
          Delivered ({delivered.length})
        </button>

        {/* Stats on the right */}
        {tab === "queue" && (
          <div className="flex items-center gap-3 text-sm ml-auto">
            {transitCount > 0 && (
              <span className="text-text-secondary">
                <span className="font-semibold text-teal-600">{transitCount}</span> active
              </span>
            )}
            {problemCount > 0 && (
              <span className="text-text-secondary">
                <span className="font-semibold text-red-500">{problemCount}</span> issues
              </span>
            )}
          </div>
        )}
      </div>

      {/* Queue tab */}
      {tab === "queue" && (
        <div className="px-4 py-2 space-y-3">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-text-muted">
              <CheckCircle size={48} className="mb-3 text-success" />
              <p className="text-base font-medium text-text">All delivered!</p>
              <p className="text-sm mt-1">No pending requests at the moment</p>
            </div>
          ) : (
            requests.map((req) => (
              <QueueCard
                key={req.id}
                request={req}
                operatorName={userName}
                onUpdate={loadQueue}
                disabled={activeCardId !== null && activeCardId !== req.id}
                hasActiveTransit={transitCount > 0 && req.status !== "in_transit"}
                onActiveChange={(active) =>
                  setActiveCardId(active ? req.id : null)
                }
              />
            ))
          )}
        </div>
      )}

      {/* Delivered tab */}
      {tab === "delivered" && (
        <div className="px-4 py-2 space-y-2">
          {delivered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-text-muted">
              <Package size={48} className="mb-3" />
              <p className="text-base font-medium text-text">No deliveries yet</p>
            </div>
          ) : (
            delivered.map((req) => (
              <DeliveredCard key={req.id} request={req} />
            ))
          )}
        </div>
      )}
    </main>
  );
}

/** Compact read-only card for delivered items */
function DeliveredCard({ request }: { request: MaterialRequest }) {
  const lotNumber = request.lot?.lot_number ?? "—";
  const deliveredTime = request.delivered_at
    ? new Date(request.delivered_at)
    : null;

  const fmtTime = deliveredTime
    ? `${String(deliveredTime.getHours()).padStart(2, "0")}:${String(deliveredTime.getMinutes()).padStart(2, "0")}`
    : null;

  const missingCount = request.sub_items?.filter((i) => i.status === "missing").length ?? 0;

  return (
    <div className="bg-card rounded-xl border border-border p-3 flex items-center gap-3"
      style={{ borderLeftWidth: 4, borderLeftColor: "#D1D5DB" }}
    >
      <CheckCircle size={18} className="text-green-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-text text-[15px]">Lot {lotNumber}</span>
          {missingCount > 0 && (
            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
              {missingCount} missing
            </span>
          )}
        </div>
        <p className="text-[13px] text-text-secondary truncate">
          {request.material_name}
          {request.requested_by_name ? ` · ${request.requested_by_name}` : ""}
        </p>
      </div>
      {fmtTime && (
        <div className="flex items-center gap-1 text-[12px] text-text-muted shrink-0">
          <Clock size={11} />
          {fmtTime}
        </div>
      )}
    </div>
  );
}
