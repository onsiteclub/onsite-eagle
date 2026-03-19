"use client";

import { Link2, HardHat } from "lucide-react";

export default function RequestLandingPage() {
  return (
    <main className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <HardHat size={48} className="text-brand mb-4" />
      <h2 className="text-xl font-bold text-text">Material Requests</h2>
      <p className="text-sm text-text-muted mt-2 max-w-xs">
        Use the lot link provided by your supervisor to create and track requests.
      </p>
      <div className="flex items-center gap-2 mt-6 bg-brand/5 border border-brand/20 rounded-xl px-4 py-3 text-sm text-brand">
        <Link2 size={16} />
        <span>Each lot has a unique link</span>
      </div>
    </main>
  );
}
