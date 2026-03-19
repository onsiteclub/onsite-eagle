"use client";

import { useState, useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { getDeadlineInfo, formatRequestTime, type DeadlineStatus } from "@/lib/deadline";

/**
 * Shows deadline countdown with color coding.
 * Auto-updates every 30 seconds to keep countdown fresh.
 *
 * For active requests (not delivered/cancelled/problem):
 *   Shows countdown + progress bar
 *
 * For completed requests:
 *   Shows only the request timestamp
 */
export function DeadlineBadge({
  requestedAt,
  urgency,
  status,
  compact,
}: {
  requestedAt: string;
  urgency: string;
  status: string;
  /** Compact mode: just the countdown pill, no timestamp */
  compact?: boolean;
}) {
  const [, setTick] = useState(0);

  // Auto-refresh every 30s
  useEffect(() => {
    if (["delivered", "cancelled"].includes(status)) return;
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, [status]);

  const isActive = !["delivered", "cancelled"].includes(status);
  const info = getDeadlineInfo(requestedAt, urgency);

  if (compact) {
    if (!isActive) return null;
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold ${info.bgColor} ${info.textColor}`}>
        {info.status === "overdue" ? (
          <AlertTriangle size={10} />
        ) : (
          <Clock size={10} />
        )}
        {info.label}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      {/* Request timestamp */}
      <span className="text-text-muted">
        {formatRequestTime(requestedAt)}
      </span>

      {/* Countdown pill (only for active requests) */}
      {isActive && (
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-semibold ${info.bgColor} ${info.textColor}`}>
          {info.status === "overdue" ? (
            <AlertTriangle size={10} />
          ) : (
            <Clock size={10} />
          )}
          {info.label}
        </span>
      )}
    </div>
  );
}

/**
 * Thin progress bar showing time remaining.
 * Shrinks from left to right, changes color with urgency.
 */
export function DeadlineBar({
  requestedAt,
  urgency,
  status,
}: {
  requestedAt: string;
  urgency: string;
  status: string;
}) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (["delivered", "cancelled"].includes(status)) return;
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, [status]);

  if (["delivered", "cancelled"].includes(status)) return null;

  const info = getDeadlineInfo(requestedAt, urgency);
  const widthPct = Math.max(0, Math.min(100, info.percentRemaining));

  return (
    <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-1000"
        style={{
          width: `${widthPct}%`,
          backgroundColor: info.color,
        }}
      />
    </div>
  );
}
