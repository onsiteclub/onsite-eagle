"use client";

import { Link2, Truck } from "lucide-react";

export default function OperatorLandingPage() {
  return (
    <main className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <Truck size={48} className="text-brand mb-4" />
      <h2 className="text-xl font-bold text-text">Deliveries</h2>
      <p className="text-sm text-text-muted mt-2 max-w-xs">
        Use the site link provided by your supervisor to manage deliveries.
      </p>
      <div className="flex items-center gap-2 mt-6 bg-brand/5 border border-brand/20 rounded-xl px-4 py-3 text-sm text-brand">
        <Link2 size={16} />
        <span>Each site has an operator link</span>
      </div>
    </main>
  );
}
