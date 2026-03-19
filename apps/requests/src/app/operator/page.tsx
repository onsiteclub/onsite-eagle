"use client";

import { useEffect, useState, useCallback } from "react";
import { getCookie } from "@/lib/cookies";
import { QueueCard } from "@/components/QueueCard";
import { RefreshCw, Loader2, CheckCircle } from "lucide-react";

interface MaterialRequest {
  id: string;
  material_name: string;
  quantity: number;
  unit: string;
  status: string;
  urgency_level: string;
  urgency_score: number;
  requested_at: string;
  requested_by_name: string | null;
  notes: string | null;
  urgency_reason: string | null;
  lot: { lot_number: string; address: string | null } | null;
  jobsite: { name: string } | null;
}

const POLL_INTERVAL = 4000;

export default function OperatorPage() {
  const [operatorName, setOperatorName] = useState("");
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadQueue = useCallback(async () => {
    const res = await fetch("/api/requests?status=requested,acknowledged,in_transit");
    if (res.ok) {
      const data = await res.json();
      // Sort: urgency desc, then oldest first
      data.sort((a: MaterialRequest, b: MaterialRequest) => {
        const urgencyOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        const ua = urgencyOrder[a.urgency_level] ?? 2;
        const ub = urgencyOrder[b.urgency_level] ?? 2;
        if (ua !== ub) return ub - ua;
        return new Date(a.requested_at).getTime() - new Date(b.requested_at).getTime();
      });
      setRequests(data);
    }
  }, []);

  useEffect(() => {
    setOperatorName(getCookie("onsite-name") ?? "Operator");

    async function init() {
      await loadQueue();
      setLoading(false);
    }
    init();
  }, [loadQueue]);

  // Polling
  useEffect(() => {
    const interval = setInterval(loadQueue, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [loadQueue]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-brand" />
      </div>
    );
  }

  const pendingCount = requests.filter(
    (r) => r.status === "requested" || r.status === "acknowledged"
  ).length;

  return (
    <main className="pb-8">
      {/* Stats bar */}
      <div className="flex items-center justify-between px-4 pt-3">
        <div className="flex items-center gap-1.5">
          <RefreshCw size={12} className="text-brand animate-spin" style={{ animationDuration: "3s" }} />
          <span className="text-xs text-text-muted">Refreshes every 4s</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-text-secondary">
            <span className="font-semibold text-text">{pendingCount}</span> pending
          </span>
          <span className="text-text-muted">&middot;</span>
          <span className="text-text-secondary">
            <span className="font-semibold text-text">{requests.length}</span> total
          </span>
        </div>
      </div>

      {/* Queue */}
      <div className="px-4 py-3 space-y-3">
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
              operatorName={operatorName}
              onUpdate={loadQueue}
            />
          ))
        )}
      </div>
    </main>
  );
}
