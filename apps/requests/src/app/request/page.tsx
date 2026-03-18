"use client";

import { useEffect, useState, useCallback } from "react";
import { getCookie } from "@/lib/cookies";
import { RequestCard } from "@/components/RequestCard";
import { NewRequestModal } from "@/components/NewRequestModal";
import { Plus, RefreshCw, Loader2, Inbox } from "lucide-react";

interface Lot {
  id: string;
  lot_number: string;
  jobsite?: { name: string } | null;
}

interface MaterialRequest {
  id: string;
  material_name: string;
  quantity: number;
  unit: string;
  status: string;
  urgency_level: string;
  requested_at: string;
  requested_by_name: string | null;
  notes: string | null;
  urgency_reason: string | null;
  lot: { lot_number: string } | null;
}

const POLL_INTERVAL = 5000;

export default function RequestPage() {
  const [userName, setUserName] = useState("");
  const [lots, setLots] = useState<Lot[]>([]);
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const loadRequests = useCallback(async () => {
    const res = await fetch("/api/requests");
    if (res.ok) {
      const data = await res.json();
      setRequests(data);
    }
  }, []);

  const loadLots = useCallback(async () => {
    const res = await fetch("/api/lots");
    if (res.ok) {
      const data = await res.json();
      setLots(data);
    }
  }, []);

  useEffect(() => {
    setUserName(getCookie("onsite-name") ?? "Worker");

    async function init() {
      await Promise.all([loadLots(), loadRequests()]);
      setLoading(false);
    }
    init();
  }, [loadLots, loadRequests]);

  // Polling for "realtime"
  useEffect(() => {
    const interval = setInterval(loadRequests, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [loadRequests]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-brand" />
      </div>
    );
  }

  return (
    <main className="pb-24">
      {/* Refresh indicator */}
      <div className="flex items-center gap-1.5 px-4 pt-3">
        <RefreshCw size={12} className="text-brand animate-spin" style={{ animationDuration: "3s" }} />
        <span className="text-xs text-text-muted">Atualiza a cada 5s</span>
      </div>

      {/* Request list */}
      <div className="px-4 py-3 space-y-3">
        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-text-muted">
            <Inbox size={48} className="mb-3" />
            <p className="text-base font-medium">Nenhum pedido ainda</p>
            <p className="text-sm mt-1">Toque no + para solicitar material</p>
          </div>
        ) : (
          requests.map((req) => <RequestCard key={req.id} request={req} />)
        )}
      </div>

      {/* FAB */}
      {lots.length > 0 && (
        <button
          onClick={() => setShowModal(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-brand text-white rounded-full shadow-lg flex items-center justify-center hover:bg-brand-dark active:scale-95 transition safe-bottom"
        >
          <Plus size={28} />
        </button>
      )}

      {/* No lots warning */}
      {lots.length === 0 && (
        <div className="mx-4 mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          Nenhum lote cadastrado. Crie lotes no Supabase para testar.
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <NewRequestModal
          lots={lots}
          userName={userName}
          onClose={() => setShowModal(false)}
          onCreated={loadRequests}
        />
      )}
    </main>
  );
}
