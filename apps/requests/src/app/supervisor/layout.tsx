"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getCookie, clearSession } from "@/lib/cookies";
import { LogOut, ClipboardList } from "lucide-react";

const TABS = [
  { key: "requests", label: "Requests", href: "/supervisor" },
  { key: "links", label: "Links", href: "/supervisor/links" },
  { key: "settings", label: "Settings", href: "/supervisor/settings" },
] as const;

export default function SupervisorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    setUserName(getCookie("onsite-name") ?? "Supervisor");
  }, []);

  function handleSignOut() {
    clearSession();
    router.push("/");
    router.refresh();
  }

  const activeTab = TABS.find((t) => pathname === t.href)?.key
    ?? (pathname.startsWith("/supervisor/links") ? "links" : "requests");

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-40 bg-slate-800 safe-top">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
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
              aria-label="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => router.push(tab.href)}
              className={`flex-1 py-2.5 text-xs font-medium text-center transition-colors relative ${
                activeTab === tab.key
                  ? "text-white"
                  : "text-white/50 hover:text-white/70"
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-brand rounded-full" />
              )}
            </button>
          ))}
        </div>
      </header>
      {children}
    </div>
  );
}
