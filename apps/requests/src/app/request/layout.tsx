"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCookie, clearSession } from "@/lib/cookies";
import { LogOut, HardHat } from "lucide-react";

export default function RequestLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    setUserName(getCookie("onsite-name") ?? "Worker");
  }, []);

  function handleSignOut() {
    clearSession();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-40 bg-brand safe-top">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-white">
            <HardHat size={20} />
            <h1 className="font-semibold text-lg">Pedidos</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white/70 text-sm">{userName}</span>
            <button
              onClick={handleSignOut}
              className="text-white/70 hover:text-white p-1"
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
