"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { HardHat, ClipboardList } from "lucide-react";

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

const ROLE_CONFIG: Record<Role, { label: string; desc: string; path: string; Icon: typeof ClipboardList }> = {
  worker: { label: "Worker", desc: "Request materials", path: "/request", Icon: ClipboardList },
  operator: { label: "Operator", desc: "Deliver materials", path: "/operator", Icon: ClipboardList },
  supervisor: { label: "Supervisor", desc: "Manage sites & requests", path: "/supervisor", Icon: ClipboardList },
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
            Field material requests
          </p>
        </div>

        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-text mb-1">
              Your name
            </label>
            <input
              id="name"
              type="text"
              autoCapitalize="words"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) enter(hostRole ?? "supervisor");
              }}
              className="w-full px-3 py-3 rounded-xl border border-border bg-bg text-text text-base outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition"
              placeholder="e.g. John Smith"
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
              Enter as {cfg.label}
            </button>
          ) : (
            /* Generic host — Supervisor only (worker + operator enter via links) */
            <div className="space-y-3">
              <button
                onClick={() => enter("supervisor")}
                disabled={!name.trim()}
                className="w-full flex items-center justify-center gap-2 bg-brand text-white font-medium py-3.5 px-4 rounded-xl hover:bg-brand-dark active:scale-[0.98] transition disabled:opacity-40"
              >
                <ClipboardList size={20} />
                Enter as Supervisor
              </button>

              <p className="text-xs text-text-muted text-center pt-1">
                Worker or Operator? Use the link shared by your supervisor.
              </p>
            </div>
          )}
        </div>

        <p className="text-xs text-text-muted text-center mt-6">
          Test mode &middot; OnSite Club
        </p>
      </div>
    </main>
  );
}
