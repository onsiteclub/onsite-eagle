"use client";

import { useEffect, useState } from "react";
import { X, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { subscribe, dismissToast, getToasts, type Toast as ToastData } from "@/lib/toast";

const ICONS = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
} as const;

const STYLES = {
  success: "bg-green-600 text-white",
  warning: "bg-amber-500 text-white",
  error: "bg-red-600 text-white",
} as const;

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    setToasts(getToasts());
    return subscribe(setToasts);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type];
        return (
          <div
            key={toast.id}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg pointer-events-auto animate-[slideUp_0.2s_ease-out] ${STYLES[toast.type]}`}
          >
            <Icon size={18} className="shrink-0" />
            <span className="text-sm font-medium flex-1">{toast.message}</span>
            <button
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 p-0.5 rounded-full hover:bg-white/20 transition"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
