/**
 * Lightweight toast notification store.
 * Uses a simple subscriber pattern (no React context needed).
 *
 * Usage:
 *   import { showToast } from "@/lib/toast";
 *   showToast({ type: "error", message: "Something failed" });
 */

export type ToastType = "success" | "error" | "warning";

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

type Listener = (toasts: Toast[]) => void;

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((fn) => fn([...toasts]));
}

export function showToast({ type, message }: { type: ToastType; message: string }) {
  const id = nextId++;
  toasts = [...toasts, { id, type, message }];
  notify();

  // Auto-dismiss after 4s
  setTimeout(() => {
    dismissToast(id);
  }, 4000);
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getToasts(): Toast[] {
  return [...toasts];
}
