/**
 * OnSite Text Report Helpers
 *
 * Plain text report generation for Timekeeper and similar apps.
 * Designed for clipboard sharing, .txt download, and Web Share API.
 */

import { formatMinutesToHours } from './branding';

/**
 * Generate a unique reference code for a report.
 *
 * Format: {REGION}-{USER_LAST_4}-{MMDD}-{SESSION_COUNT}
 * Example: QC-A1B2-0217-05
 */
export function generateRefCode(
  userId: string,
  sessionCount: number,
  regionCode: string = 'XX'
): string {
  const now = new Date();
  const userPart = userId.replace(/-/g, '').slice(-4).toUpperCase();
  const datePart = `${(now.getMonth() + 1).toString().padStart(2, '0')}${now
    .getDate()
    .toString()
    .padStart(2, '0')}`;
  const sessionsPart = Math.min(sessionCount, 99).toString().padStart(2, '0');
  return `${regionCode}-${userPart}-${datePart}-${sessionsPart}`;
}

/** Session data for text reports */
export interface TextSession {
  entry_at: string;
  exit_at?: string | null;
  geofence_name?: string | null;
  duration_minutes?: number | null;
  pause_minutes?: number | null;
  manually_edited?: boolean;
}

/**
 * Generate a single-day text report.
 */
export function generateDayReport(options: {
  userName: string;
  date: Date;
  sessions: TextSession[];
  userId: string;
  regionCode?: string;
  formatDuration?: (minutes: number) => string;
}): string {
  const {
    userName,
    date,
    sessions,
    userId,
    regionCode = 'XX',
    formatDuration = formatMinutesToHours,
  } = options;

  const totalMinutes = sessions.reduce(
    (sum, s) => sum + (s.duration_minutes || 0) - (s.pause_minutes || 0),
    0
  );

  const dateStr = date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });

  let report = `${userName}\n`;
  report += `--------------------\n`;
  report += `\u{1F4C5}  ${dateStr}\n`;

  sessions.forEach((session) => {
    const entryTime = new Date(session.entry_at).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    const exitTime = session.exit_at
      ? new Date(session.exit_at).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      : 'In Progress';

    report += `\u{1F4CD} ${session.geofence_name || 'Unknown Location'}\n`;

    if (session.manually_edited) {
      report += `*Edited \u279C ${entryTime} -> ${exitTime}\n`;
    } else {
      report += `\u279C ${entryTime} -> ${exitTime}\n`;
    }

    if ((session.pause_minutes || 0) > 0) {
      report += `Break: ${session.pause_minutes}min\n`;
    }

    const netMinutes = (session.duration_minutes || 0) - (session.pause_minutes || 0);
    report += `\u279C ${formatDuration(netMinutes)}\n\n`;
  });

  report += `====================\n`;
  report += `TOTAL: ${formatDuration(totalMinutes)}\n\n`;
  report += `OnSite Timekeeper\n`;
  report += `Ref #   ${generateRefCode(userId, sessions.length, regionCode)}\n`;

  return report;
}

/**
 * Generate a multi-day text report.
 */
export function generateMultiDayReport(options: {
  userName: string;
  userId: string;
  selectedDays: string[];
  sessions: TextSession[];
  regionCode?: string;
  formatDuration?: (minutes: number) => string;
}): string {
  const {
    userName,
    userId,
    selectedDays,
    sessions,
    regionCode = 'XX',
    formatDuration = formatMinutesToHours,
  } = options;

  let report = `${userName}\n`;
  report += `====================\n`;

  let grandTotal = 0;

  for (const dayKey of selectedDays) {
    const date = new Date(dayKey + 'T00:00:00');
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const daySessions = sessions.filter((s) => {
      const entryDate = new Date(s.entry_at);
      return entryDate >= dayStart && entryDate <= dayEnd;
    });

    if (daySessions.length === 0) continue;

    const dateStr = date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    });

    report += `\n\u{1F4C5}  ${dateStr}\n`;
    report += `--------------------\n`;

    daySessions.forEach((session) => {
      const entryTime = new Date(session.entry_at).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      const exitTime = session.exit_at
        ? new Date(session.exit_at).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })
        : 'In Progress';

      report += `\u{1F4CD} ${session.geofence_name || 'Unknown Location'}\n`;

      if (session.manually_edited) {
        report += `*Edited \u279C ${entryTime} -> ${exitTime}\n`;
      } else {
        report += `\u279C ${entryTime} -> ${exitTime}\n`;
      }

      if ((session.pause_minutes || 0) > 0) {
        report += `Break: ${session.pause_minutes}min\n`;
      }

      const netMinutes = (session.duration_minutes || 0) - (session.pause_minutes || 0);
      report += `\u279C ${formatDuration(netMinutes)}\n`;
    });

    const dayTotal = daySessions.reduce(
      (sum, s) => sum + (s.duration_minutes || 0) - (s.pause_minutes || 0),
      0
    );
    grandTotal += dayTotal;
    report += `Day Total: ${formatDuration(dayTotal)}\n`;
  }

  report += `\n====================\n`;
  report += `GRAND TOTAL: ${formatDuration(grandTotal)}\n`;
  report += `Days: ${selectedDays.length}\n\n`;
  report += `OnSite Timekeeper\n`;
  report += `Ref #   ${generateRefCode(userId, sessions.length, regionCode)}\n`;

  return report;
}
