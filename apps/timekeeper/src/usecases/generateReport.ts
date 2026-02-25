/**
 * Generate Report — Aggregate data and produce output in various formats.
 *
 * Pipeline: aggregate → AI summary (optional) → render → share.
 *
 * Spec: 06-USECASES.md "usecases/generateReport.ts"
 */
import { getDb } from '../lib/database';
import { getUserId } from '@onsite/auth/core';
import { callAI } from '@onsite/ai';
import { logger } from '@onsite/logger';
import { SOURCE_PRIORITY } from '@onsite/shared';
import type { ReportModel, ReportDay, DayType, DayFlag, SessionSource } from '@onsite/shared';
import { supabase } from '../lib/supabase';
import { buildWorkerProfile } from '../ai/profile';
import { renderHtml } from '../reporting/renderHtml';
import { sharePdf, shareText } from '../reporting/share';
import { formatWhatsApp, formatPlainText } from '../reporting/whatsapp';

interface DaySummaryRow {
  date: string;
  total_minutes: number;
  break_minutes: number;
  first_entry: string | null;
  last_exit: string | null;
  sessions_count: number;
  primary_location: string | null;
  type: string;
  flags: string;
  source_mix: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getDayName(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return DAY_NAMES[d.getDay()];
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().slice(0, 10);
}

/**
 * Aggregate data from day_summary for a date range.
 */
export async function aggregate(startDate: string, endDate: string): Promise<ReportModel> {
  const db = getDb();
  const userId = await getUserId();
  if (!userId) throw new Error('No authenticated user');

  // Read day_summary for period
  const rows = await db.getAllAsync<DaySummaryRow>(`
    SELECT date, total_minutes, break_minutes, first_entry, last_exit,
           sessions_count, primary_location, type, flags, source_mix
    FROM day_summary
    WHERE user_id = ? AND date BETWEEN ? AND ? AND deleted_at IS NULL
    ORDER BY date ASC
  `, [userId, startDate, endDate]);

  // Map to ReportDay
  const days: ReportDay[] = rows.map((d) => {
    const flags: DayFlag[] = JSON.parse(d.flags || '[]');
    const sourceMix: Record<string, number> = JSON.parse(d.source_mix || '{}');
    const primarySource = Object.keys(sourceMix).sort(
      (a, b) => (SOURCE_PRIORITY[b] || 0) - (SOURCE_PRIORITY[a] || 0),
    )[0] || 'gps';

    return {
      date: d.date,
      dayOfWeek: getDayName(d.date),
      firstEntry: d.first_entry || '--:--',
      lastExit: d.last_exit || '--:--',
      totalMinutes: d.total_minutes || 0,
      breakMinutes: d.break_minutes || 0,
      locationName: d.primary_location || '',
      type: (d.type || 'work') as DayType,
      flags,
      source: primarySource as SessionSource,
    };
  });

  // Calculate totals
  const totalMinutes = days.reduce((s, d) => s + d.totalMinutes, 0);
  const breakMinutes = days.reduce((s, d) => s + d.breakMinutes, 0);
  const workDays = days.filter((d) => d.type === 'work' && d.totalMinutes > 0).length;

  // Weekly totals
  const weekMap = new Map<string, number>();
  for (const d of days) {
    const ws = getWeekStart(d.date);
    weekMap.set(ws, (weekMap.get(ws) || 0) + d.totalMinutes);
  }
  const weeklyTotals = Array.from(weekMap.entries()).map(([weekStart, totalMins]) => ({
    weekStart,
    totalMinutes: totalMins,
  }));

  // Overtime (Ontario standard: >44h/week)
  const overtimeHours = weeklyTotals.reduce((s, w) => {
    const weekHours = w.totalMinutes / 60;
    return s + Math.max(0, weekHours - 44);
  }, 0);

  // Worker info
  const profile = await db.getFirstAsync<{ full_name: string; email: string }>(
    `SELECT full_name, email FROM core_profiles WHERE id = ?`,
    [userId],
  ).catch(() => null);

  return {
    worker: {
      name: profile?.full_name || 'Worker',
      email: profile?.email || '',
    },
    period: { start: startDate, end: endDate },
    days,
    totals: {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
      workDays,
      breakMinutes,
      overtimeHours: Math.round(overtimeHours * 10) / 10,
    },
    weeklyTotals,
  };
}

export type ReportFormat = 'pdf' | 'whatsapp' | 'text';

export interface GenerateReportInput {
  startDate: string;
  endDate: string;
  format: ReportFormat;
  includeAISummary?: boolean;
}

/**
 * Generate a report for a date range.
 * Orchestrates: aggregate → AI summary (optional) → render → share.
 */
export async function generateReport(input: GenerateReportInput): Promise<ReportModel> {
  const model = await aggregate(input.startDate, input.endDate);

  // AI summary (optional, non-blocking)
  let aiSummary: string | undefined;
  if (input.includeAISummary !== false) {
    try {
      const userId = await getUserId();
      const profile = userId ? await buildWorkerProfile(userId) : null;
      const result = await callAI(
        {
          specialist: 'timekeeper:secretary',
          context: {
            mode: 'report',
            days: model.days,
            totals: model.totals,
            worker_profile: profile,
          },
        },
        supabase,
      );
      if (result.action !== 'error' && result.data) {
        const data = result.data as { narrative?: string; summary?: { narrative?: string } };
        aiSummary = data.narrative || data.summary?.narrative;
      }
    } catch {
      // AI is always optional — PDF generates without summary
    }
  }

  if (aiSummary) {
    model.aiSummary = aiSummary;
  }

  // Render and share based on format
  try {
    switch (input.format) {
      case 'pdf': {
        const html = renderHtml(model, aiSummary);
        const filename = `timesheet-${input.startDate}-to-${input.endDate}`;
        await sharePdf(html, filename);
        break;
      }
      case 'whatsapp': {
        const text = formatWhatsApp(model);
        await shareText(text, 'OnSite Timesheet');
        break;
      }
      case 'text': {
        const text = formatPlainText(model);
        await shareText(text, 'OnSite Timesheet');
        break;
      }
    }
  } catch (error) {
    logger.warn('USECASE', 'Report sharing failed, returning model only', { error: String(error) });
  }

  logger.info('USECASE', 'Report generated', {
    period: `${input.startDate} to ${input.endDate}`,
    format: input.format,
    days: model.days.length,
    totalHours: `${model.totals.hours}h ${model.totals.minutes}m`,
    hasAISummary: !!aiSummary,
  });

  return model;
}
