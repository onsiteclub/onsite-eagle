"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { getCookie } from "@/lib/cookies";
import { RequestCard } from "@/components/RequestCard";
import { NewRequestModal } from "@/components/NewRequestModal";
import { Plus, RefreshCw, Loader2, Inbox, AlertTriangle, ChevronRight } from "lucide-react";

interface LotInfo {
  id: string;
  lot_number: string;
  status: string;
  jobsite: { name: string } | null;
}

interface MyLot {
  id: string;
  lot_number: string;
  block: string | null;
  jobsite_id: string;
  status: string;
  jobsite: { name: string } | null;
}

interface MaterialRequest {
  id: string;
  material_name: string;
  quantity: number;
  unit: string;
  status: string;
  urgency_level: string;
  requested_at: string;
  in_transit_at: string | null;
  delivered_at: string | null;
  requested_by_name: string | null;
  delivered_by_name: string | null;
  delivery_notes: string | null;
  photo_url: string | null;
  notes: string | null;
  urgency_reason: string | null;
  sub_items?: { name: string; status: string }[] | null;
  lot: { lot_number: string } | null;
}

type Filter = "all" | "pending" | "delivered" | "problem";

const POLL_INTERVAL = 5000;

export default function LotRequestPage() {
  const { lotId } = useParams<{ lotId: string }>();
  const [userName, setUserName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [lotInfo, setLotInfo] = useState<LotInfo | null>(null);
  const [lotError, setLotError] = useState(false);
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [myLots, setMyLots] = useState<MyLot[]>([]);

  // Load lot details
  const loadLot = useCallback(async () => {
    const res = await fetch(`/api/lots/${lotId}`);
    if (!res.ok) {
      setLotError(true);
      return null;
    }
    const data = await res.json();
    setLotInfo(data);
    return data;
  }, [lotId]);

  // Load requests for this lot only
  const loadRequests = useCallback(async () => {
    const res = await fetch(`/api/requests?lot_id=${lotId}`);
    if (res.ok) {
      const data = await res.json();
      setRequests(data);
    }
  }, [lotId]);

  // Register worker name on lot + get all their lots
  const registerWorker = useCallback(async (name: string) => {
    const res = await fetch(`/api/lots/${lotId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ worker_name: name }),
    });
    if (res.ok) {
      const data = await res.json();
      setMyLots((data.my_lots ?? []).filter((l: MyLot) => l.id !== lotId));
    }
  }, [lotId]);

  // Load my lots for existing user (already logged in)
  const loadMyLots = useCallback(async (name: string) => {
    const res = await fetch(`/api/lots/${lotId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ worker_name: name }),
    });
    if (res.ok) {
      const data: MyLot[] = await res.json();
      setMyLots(data.filter((l) => l.id !== lotId));
    }
  }, [lotId]);

  useEffect(() => {
    const name = getCookie("onsite-name");
    if (name) setUserName(name);

    async function init() {
      await loadLot();
      await loadRequests();
      setLoading(false);
      // Register + load my lots if already logged in
      if (name) {
        registerWorker(name);
      }
    }
    init();
  }, [loadLot, loadRequests, registerWorker]);

  // Polling
  useEffect(() => {
    if (!userName) return;
    const interval = setInterval(loadRequests, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [loadRequests, userName]);

  // Set page title
  useEffect(() => {
    if (lotInfo) {
      const site = lotInfo.jobsite?.name ?? "";
      const label = `Lot ${lotInfo.lot_number}${site ? ` — ${site}` : ""}`;
      document.title = `Material Requests ${label}`;
    }
  }, [lotInfo]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const name = nameInput.trim();
    if (!name) return;
    document.cookie = `onsite-name=${encodeURIComponent(name)};path=/;max-age=${30 * 24 * 60 * 60}`;
    document.cookie = `onsite-role=worker;path=/;max-age=${30 * 24 * 60 * 60}`;
    setUserName(name);
    // Register on this lot + get all my lots
    registerWorker(name);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-brand" />
      </div>
    );
  }

  // Lot not found
  if (lotError || !lotInfo) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <AlertTriangle size={48} className="text-yellow-500 mb-3" />
        <h2 className="text-lg font-semibold text-text">Lot not found</h2>
        <p className="text-sm text-text-muted mt-1">
          Check the link with your supervisor.
        </p>
      </div>
    );
  }

  const siteName = lotInfo.jobsite?.name ?? "";

  // Login inline — no name cookie yet
  if (!userName) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-brand/10 text-brand px-3 py-1.5 rounded-full text-sm font-medium mb-4">
              Lot {lotInfo.lot_number} {siteName && `— ${siteName}`}
            </div>
            <h2 className="text-xl font-bold text-text">Material Requests</h2>
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

  // Filter: only show this worker's requests
  const myRequests = requests.filter(
    (r) => r.requested_by_name === userName
  );

  // Apply status filter
  const filtered = myRequests.filter((r) => {
    if (filter === "pending") return ["requested", "acknowledged", "in_transit"].includes(r.status);
    if (filter === "delivered") return r.status === "delivered";
    if (filter === "problem") return r.status === "problem";
    return true;
  });

  // Counts for tabs
  const pendingCount = myRequests.filter((r) =>
    ["requested", "acknowledged", "in_transit"].includes(r.status)
  ).length;
  const deliveredCount = myRequests.filter((r) => r.status === "delivered").length;
  const problemCount = myRequests.filter((r) => r.status === "problem").length;

  const TABS: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: myRequests.length },
    { key: "pending", label: "Pending", count: pendingCount },
    { key: "delivered", label: "Delivered", count: deliveredCount },
    { key: "problem", label: "Problem", count: problemCount },
  ];

  // Logged in — show requests for this lot
  return (
    <main className="pb-24">
      {/* Lot info bar */}
      <div className="flex items-center justify-between px-4 pt-3">
        <div className="flex items-center gap-2">
          <span className="bg-brand/10 text-brand text-xs font-medium px-2 py-1 rounded-full">
            Lot {lotInfo.lot_number}
          </span>
          {siteName && <span className="text-xs text-text-muted">{siteName}</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <RefreshCw size={12} className="text-brand animate-spin" style={{ animationDuration: "3s" }} />
          <span className="text-xs text-text-muted">5s</span>
        </div>
      </div>

      {/* My Lots bar — other lots this worker is registered on */}
      {myLots.length > 0 && (
        <div className="px-4 pt-2">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {myLots.map((ml) => (
              <a
                key={ml.id}
                href={`/request/${ml.id}`}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-text-secondary whitespace-nowrap transition shrink-0"
              >
                Lot {ml.lot_number}
                {ml.jobsite?.name && (
                  <span className="text-text-muted">({ml.jobsite.name})</span>
                )}
                <ChevronRight size={10} className="text-text-muted" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 px-4 pt-2 pb-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
              filter === tab.key
                ? tab.key === "problem"
                  ? "bg-red-100 text-red-700"
                  : "bg-brand/10 text-brand"
                : "bg-gray-100 text-text-muted hover:bg-gray-200"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Request list */}
      <div className="px-4 py-3 space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-text-muted">
            <Inbox size={48} className="mb-3" />
            <p className="text-base font-medium">
              {myRequests.length === 0 ? "No requests yet" : "No matching requests"}
            </p>
            <p className="text-sm mt-1">
              {myRequests.length === 0 ? "Tap + to request material" : "Try a different filter"}
            </p>
          </div>
        ) : (
          filtered.map((req) => <RequestCard key={req.id} request={req} onUpdate={loadRequests} />)
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-brand text-white rounded-full shadow-lg flex items-center justify-center hover:bg-brand-dark active:scale-95 transition safe-bottom"
      >
        <Plus size={28} />
      </button>

      {/* Modal — lot is fixed */}
      {showModal && (
        <NewRequestModal
          lotId={lotInfo.id}
          lotLabel={`Lot ${lotInfo.lot_number}${siteName ? ` — ${siteName}` : ""}`}
          userName={userName}
          onClose={() => setShowModal(false)}
          onCreated={loadRequests}
        />
      )}
    </main>
  );
}
