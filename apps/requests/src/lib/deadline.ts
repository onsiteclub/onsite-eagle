/**
 * Deadline system based on urgency level.
 *
 * Windows:
 *   low / medium  → 4 hours
 *   high          → 2 hours
 *   critical      → 30 minutes
 *
 * Color scale (time remaining as % of window):
 *   > 50%    → green  (on track)
 *   25-50%   → yellow (attention)
 *   10-25%   → orange (warning)
 *   0-10%    → red    (urgent)
 *   overdue  → dark red (expired)
 */

/** Deadline window in minutes per urgency */
const DEADLINE_MINUTES: Record<string, number> = {
  low: 240, // 4h
  medium: 240, // 4h
  high: 120, // 2h
  critical: 30, // 30min
};

export function getDeadlineMinutes(urgency: string): number {
  return DEADLINE_MINUTES[urgency] ?? 240;
}

export function getDeadlineDate(requestedAt: string, urgency: string): Date {
  const date = new Date(requestedAt);
  date.setMinutes(date.getMinutes() + getDeadlineMinutes(urgency));
  return date;
}

export type DeadlineStatus = "on_track" | "attention" | "warning" | "urgent" | "overdue";

export interface DeadlineInfo {
  deadline: Date;
  remainingMs: number;
  remainingMinutes: number;
  totalMinutes: number;
  percentRemaining: number;
  status: DeadlineStatus;
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
}

export function getDeadlineInfo(requestedAt: string, urgency: string): DeadlineInfo {
  const totalMinutes = getDeadlineMinutes(urgency);
  const deadline = getDeadlineDate(requestedAt, urgency);
  const now = new Date();
  const remainingMs = deadline.getTime() - now.getTime();
  const remainingMinutes = Math.max(0, Math.ceil(remainingMs / 60000));
  const percentRemaining = Math.max(0, (remainingMs / (totalMinutes * 60000)) * 100);

  let status: DeadlineStatus;
  let color: string;
  let bgColor: string;
  let textColor: string;

  if (remainingMs <= 0) {
    status = "overdue";
    color = "#991B1B"; // red-800
    bgColor = "bg-red-100";
    textColor = "text-red-800";
  } else if (percentRemaining <= 10) {
    status = "urgent";
    color = "#DC2626"; // red-600
    bgColor = "bg-red-50";
    textColor = "text-red-700";
  } else if (percentRemaining <= 25) {
    status = "warning";
    color = "#EA580C"; // orange-600
    bgColor = "bg-orange-50";
    textColor = "text-orange-700";
  } else if (percentRemaining <= 50) {
    status = "attention";
    color = "#CA8A04"; // yellow-600
    bgColor = "bg-yellow-50";
    textColor = "text-yellow-700";
  } else {
    status = "on_track";
    color = "#16A34A"; // green-600
    bgColor = "bg-green-50";
    textColor = "text-green-700";
  }

  // Human-readable label
  let label: string;
  if (remainingMs <= 0) {
    const overdueMin = Math.abs(Math.floor(remainingMs / 60000));
    if (overdueMin < 60) {
      label = `${overdueMin}min overdue`;
    } else {
      const h = Math.floor(overdueMin / 60);
      const m = overdueMin % 60;
      label = m > 0 ? `${h}h${m}m overdue` : `${h}h overdue`;
    }
  } else if (remainingMinutes < 60) {
    label = `${remainingMinutes}min left`;
  } else {
    const h = Math.floor(remainingMinutes / 60);
    const m = remainingMinutes % 60;
    label = m > 0 ? `${h}h${m}m left` : `${h}h left`;
  }

  return {
    deadline,
    remainingMs,
    remainingMinutes,
    totalMinutes,
    percentRemaining,
    status,
    label,
    color,
    bgColor,
    textColor,
  };
}

/** Format date as "19/03/2026, 07:07" */
export function formatRequestTime(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year}, ${hours}:${minutes}`;
}
