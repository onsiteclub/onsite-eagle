"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface Lot {
  id: string;
  lot_number: string;
  jobsite?: { name: string } | null;
}

const UNITS = [
  { value: "pcs", label: "Peças" },
  { value: "boards", label: "Tábuas" },
  { value: "sheets", label: "Folhas" },
  { value: "bundles", label: "Feixes" },
  { value: "bags", label: "Sacos" },
  { value: "rolls", label: "Rolos" },
];

const URGENCY = [
  { value: "low", label: "Baixa — 24h+" },
  { value: "medium", label: "Normal — Hoje" },
  { value: "high", label: "Alta — Em horas" },
  { value: "critical", label: "Urgente — Bloqueando trabalho" },
];

export function NewRequestModal({
  lots,
  userName,
  onClose,
  onCreated,
}: {
  lots: Lot[];
  userName: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [material, setMaterial] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [lotId, setLotId] = useState(lots.length === 1 ? lots[0].id : "");
  const [urgency, setUrgency] = useState("medium");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!material.trim() || !quantity || !lotId) return;

    setLoading(true);
    setError("");

    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        material_name: material.trim(),
        quantity: parseInt(quantity),
        unit,
        lot_id: lotId,
        urgency_level: urgency,
        notes: notes.trim() || null,
        requested_by_name: userName,
      }),
    });

    if (!res.ok) {
      setError("Erro ao enviar pedido. Tente novamente.");
      setLoading(false);
      return;
    }

    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90dvh] overflow-y-auto safe-bottom">
        <div className="sticky top-0 bg-card flex items-center justify-between p-4 border-b border-border rounded-t-2xl">
          <h2 className="text-lg font-semibold text-text">Novo Pedido</h2>
          <button onClick={onClose} className="p-1 text-text-secondary hover:text-text">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">Material *</label>
            <input
              type="text"
              required
              autoCapitalize="words"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              className="w-full px-3 py-3 rounded-xl border border-border bg-bg text-text text-base outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              placeholder="Ex: 2x10 LVL Beam"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Quantidade *</label>
              <input
                type="number"
                required
                min={1}
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-3 rounded-xl border border-border bg-bg text-text text-base outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                placeholder="10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Unidade</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-3 rounded-xl border border-border bg-bg text-text text-base outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              >
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Lote *</label>
            <select
              required
              value={lotId}
              onChange={(e) => setLotId(e.target.value)}
              className="w-full px-3 py-3 rounded-xl border border-border bg-bg text-text text-base outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            >
              <option value="">Selecione o lote</option>
              {lots.map((lot) => (
                <option key={lot.id} value={lot.id}>
                  Lot {lot.lot_number} {lot.jobsite ? `— ${lot.jobsite.name}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Urgência</label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              className="w-full px-3 py-3 rounded-xl border border-border bg-bg text-text text-base outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            >
              {URGENCY.map((u) => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-3 rounded-xl border border-border bg-bg text-text text-base outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand resize-none"
              placeholder="Detalhes adicionais..."
            />
          </div>

          {error && (
            <div className="text-sm text-error bg-red-50 px-3 py-2 rounded-lg">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || !material.trim() || !quantity || !lotId}
            className="w-full bg-brand text-white font-medium py-3 px-4 rounded-xl hover:bg-brand-dark active:scale-[0.98] transition disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            ) : (
              "Enviar Pedido"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
