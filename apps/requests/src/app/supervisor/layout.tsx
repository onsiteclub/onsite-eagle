"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCookie, clearSession } from "@/lib/cookies";
import { LogOut, ClipboardList } from "lucide-react";

export default function SupervisorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    setUserName(getCookie("onsite-name") ?? "Supervisor");
  }, []);

  function handleSignOut() {
    clearSession();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-40 bg-[#1E293B] safe-top">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-white">
            <ClipboardList size={20} />
            <h1 className="font-semibold text-lg">Supervisor</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white/70 text-sm">{userName}</span>
            <button
              onClick={handleSignOut}
              className="text-white/70 hover:text-white p-1"
              title="Sign out"
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
