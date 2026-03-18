"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { HardHat, Truck, Wrench, ClipboardList } from "lucide-react";

type Role = "worker" | "operator" | "supervisor";

// Detect role from hostname (mirrors middleware logic)
function getRoleFromHost(): Role | null {
  if (typeof window === "undefined") return null;
  const h = window.location.hostname;
  if (h.startsWith("operator.") || h.startsWith("operator-")) return "operator";
  if (h.startsWith("worker.") || h.startsWith("worker-")) return "worker";
  if (h.startsWith("supervisor.") || h.startsWith("supervisor-")) return "supervisor";
  return null;
}

const ROLE_CONFIG: Record<Role, { label: string; desc: string; path: string; Icon: typeof Wrench }> = {
  worker: { label: "Trabalhador", desc: "Solicitar material", path: "/request", Icon: Wrench },
  operator: { label: "Operador", desc: "Entregar material", path: "/operator", Icon: Truck },
  supervisor: { label: "Supervisor", desc: "Gerenciar sites e pedidos", path: "/supervisor", Icon: ClipboardList },
};

export default function LoginPage() {
  const [name, setName] = useState("");
  const [hostRole, setHostRole] = useState<Role | null>(null);
  const router = useRouter();

  useEffect(() => {
    setHostRole(getRoleFromHost());
  }, []);

  function enter(role: Role) {
    if (!name.trim()) return;
    document.cookie = `onsite-name=${encodeURIComponent(name.trim())}; path=/; max-age=${60 * 60 * 24 * 30}`;
    document.cookie = `onsite-role=${role}; path=/; max-age=${60 * 60 * 24 * 30}`;
    router.push(ROLE_CONFIG[role].path);
  }

  const cfg = hostRole ? ROLE_CONFIG[hostRole] : null;

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 bg-bg">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-brand rounded-2xl flex items-center justify-center mb-4">
            <HardHat size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text">OnSite Requests</h1>
          <p className="text-sm text-text-secondary mt-1">
            Pedidos de material em campo
          </p>
        </div>

        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-text mb-1">
              Seu nome
            </label>
            <input
              id="name"
              type="text"
              autoCapitalize="words"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) enter(hostRole ?? "worker");
              }}
              className="w-full px-3 py-3 rounded-xl border border-border bg-bg text-text text-base outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
              placeholder="Ex: João Silva"
            />
          </div>

          {/* Hostname detected a role — single button */}
          {cfg ? (
            <button
              onClick={() => enter(hostRole!)}
              disabled={!name.trim()}
              className="w-full flex items-center justify-center gap-2 bg-brand text-white font-medium py-3.5 px-4 rounded-xl hover:bg-brand-dark active:scale-[0.98] transition disabled:opacity-40"
            >
              <cfg.Icon size={20} />
              Entrar como {cfg.label}
            </button>
          ) : (
            /* Generic host — show all options */
            <div className="space-y-3">
              <p className="text-sm text-text-secondary text-center">Entrar como:</p>

              <button
                onClick={() => enter("worker")}
                disabled={!name.trim()}
                className="w-full flex items-center gap-3 bg-brand text-white font-medium py-3.5 px-4 rounded-xl hover:bg-brand-dark active:scale-[0.98] transition disabled:opacity-40"
              >
                <Wrench size={20} />
                <div className="text-left">
                  <div className="font-semibold">Trabalhador</div>
                  <div className="text-xs text-white/70">Solicitar material</div>
                </div>
              </button>

              <button
                onClick={() => enter("operator")}
                disabled={!name.trim()}
                className="w-full flex items-center gap-3 bg-card text-text border-2 border-brand font-medium py-3.5 px-4 rounded-xl hover:bg-brand/5 active:scale-[0.98] transition disabled:opacity-40"
              >
                <Truck size={20} className="text-brand" />
                <div className="text-left">
                  <div className="font-semibold">Operador</div>
                  <div className="text-xs text-text-secondary">Entregar material</div>
                </div>
              </button>

              <button
                onClick={() => enter("supervisor")}
                disabled={!name.trim()}
                className="w-full flex items-center gap-3 bg-card text-text border-2 border-border font-medium py-3.5 px-4 rounded-xl hover:bg-gray-50 active:scale-[0.98] transition disabled:opacity-40"
              >
                <ClipboardList size={20} className="text-text-secondary" />
                <div className="text-left">
                  <div className="font-semibold">Supervisor</div>
                  <div className="text-xs text-text-secondary">Gerenciar sites e pedidos</div>
                </div>
              </button>
            </div>
          )}
        </div>

        <p className="text-xs text-text-muted text-center mt-6">
          Modo teste &middot; OnSite Club
        </p>
      </div>
    </main>
  );
}
