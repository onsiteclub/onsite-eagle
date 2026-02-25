/**
 * Render HTML — Convert ReportModel to a professional HTML timesheet.
 *
 * This HTML is passed to expo-print for PDF generation.
 * Design: OnSite Club letterhead, daily breakdown, weekly subtotals, AI summary.
 *
 * Spec: 08-REPORTS.md "reporting/renderHtml.ts"
 */
import type { ReportModel, ReportDay, DayFlag } from '@onsite/shared';

const BRAND_COLOR = '#FF6B35';
const BRAND_DARK = '#E55A2B';
const TEXT_PRIMARY = '#1F2937';
const TEXT_SECONDARY = '#6B7280';
const BORDER_COLOR = '#E5E7EB';
const BG_LIGHT = '#F9FAFB';
const BG_AI = '#FFF7ED';

/**
 * Format minutes as "Xh Ym".
 */
function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Format date as "Mon, Feb 10".
 */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * Get the type emoji for a day.
 */
function typeEmoji(type: string): string {
  switch (type) {
    case 'rain': return '🌧';
    case 'snow': return '❄️';
    case 'sick': return '🤒';
    case 'dayoff': return '🏠';
    case 'holiday': return '🎉';
    default: return '';
  }
}

/**
 * Check if a day has the ai_corrected flag.
 */
function isAICorrected(flags: DayFlag[]): boolean {
  return flags.includes('ai_corrected');
}

/**
 * Render a single day row in the table.
 */
function renderDayRow(day: ReportDay, isOdd: boolean): string {
  const bgColor = isOdd ? BG_LIGHT : '#FFFFFF';
  const corrected = isAICorrected(day.flags);
  const asterisk = corrected ? '<span style="color:#FF6B35;">*</span>' : '';
  const typeIcon = day.type !== 'work' ? `<span style="margin-left:4px;">${typeEmoji(day.type)}</span>` : '';

  if (day.type !== 'work') {
    return `
      <tr style="background:${bgColor};">
        <td style="padding:8px 12px;border-bottom:1px solid ${BORDER_COLOR};">${formatDate(day.date)}${typeIcon}</td>
        <td colspan="4" style="padding:8px 12px;border-bottom:1px solid ${BORDER_COLOR};color:${TEXT_SECONDARY};text-align:center;font-style:italic;">
          ${day.type.charAt(0).toUpperCase() + day.type.slice(1)} Day
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid ${BORDER_COLOR};text-align:right;font-weight:600;">—</td>
      </tr>`;
  }

  return `
    <tr style="background:${bgColor};">
      <td style="padding:8px 12px;border-bottom:1px solid ${BORDER_COLOR};">${formatDate(day.date)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid ${BORDER_COLOR};text-align:center;">${day.firstEntry}${asterisk}</td>
      <td style="padding:8px 12px;border-bottom:1px solid ${BORDER_COLOR};text-align:center;">${day.lastExit}${asterisk}</td>
      <td style="padding:8px 12px;border-bottom:1px solid ${BORDER_COLOR};text-align:center;">${day.breakMinutes > 0 ? `${day.breakMinutes}m` : '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid ${BORDER_COLOR};">${day.locationName || '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid ${BORDER_COLOR};text-align:right;font-weight:600;">${formatDuration(day.totalMinutes)}</td>
    </tr>`;
}

/**
 * Render a weekly subtotal row.
 */
function renderWeekSubtotal(weekStart: string, totalMinutes: number): string {
  return `
    <tr style="background:#FEF3E2;">
      <td colspan="5" style="padding:8px 12px;border-bottom:2px solid ${BRAND_COLOR};font-weight:600;color:${BRAND_COLOR};">
        Week of ${formatDate(weekStart)}
      </td>
      <td style="padding:8px 12px;border-bottom:2px solid ${BRAND_COLOR};text-align:right;font-weight:700;color:${BRAND_COLOR};">
        ${formatDuration(totalMinutes)}
      </td>
    </tr>`;
}

/**
 * Render the AI summary box.
 */
function renderAISummary(summary: string): string {
  return `
    <div style="margin:24px 0;padding:16px 20px;border:2px solid ${BRAND_COLOR};border-radius:8px;background:${BG_AI};">
      <div style="font-weight:700;color:${BRAND_COLOR};margin-bottom:8px;font-size:14px;">
        AI Summary
      </div>
      <div style="color:${TEXT_PRIMARY};font-size:13px;line-height:1.6;">
        ${summary}
      </div>
    </div>`;
}

/**
 * Group days by week for subtotal rendering.
 */
function groupDaysByWeek(days: ReportDay[], weeklyTotals: { weekStart: string; totalMinutes: number }[]): Map<string, ReportDay[]> {
  const weekMap = new Map<string, ReportDay[]>();
  for (const day of days) {
    const d = new Date(day.date + 'T12:00:00');
    const dow = d.getDay();
    const diff = d.getDate() - dow + (dow === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    const weekStart = monday.toISOString().slice(0, 10);
    if (!weekMap.has(weekStart)) weekMap.set(weekStart, []);
    weekMap.get(weekStart)!.push(day);
  }
  return weekMap;
}

/**
 * Render a complete HTML timesheet report.
 */
export function renderHtml(model: ReportModel, aiSummary?: string): string {
  const hasAICorrections = model.days.some((d) => isAICorrected(d.flags));
  const weekMap = groupDaysByWeek(model.days, model.weeklyTotals);
  const weekTotalMap = new Map(model.weeklyTotals.map((w) => [w.weekStart, w.totalMinutes]));

  // Build day rows grouped by week with subtotals
  let tableRows = '';
  let rowIndex = 0;
  for (const [weekStart, days] of weekMap.entries()) {
    for (const day of days) {
      tableRows += renderDayRow(day, rowIndex % 2 === 0);
      rowIndex++;
    }
    const weekTotal = weekTotalMap.get(weekStart) || 0;
    if (weekMap.size > 1) {
      tableRows += renderWeekSubtotal(weekStart, weekTotal);
    }
  }

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: ${TEXT_PRIMARY};
      font-size: 13px;
      line-height: 1.5;
      padding: 40px;
    }
    table { width: 100%; border-collapse: collapse; }
    @media print {
      body { padding: 20px; }
    }
  </style>
</head>
<body>

  <!-- Header / Letterhead -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:16px;border-bottom:3px solid ${BRAND_COLOR};">
    <div>
      <div style="font-size:28px;font-weight:800;color:${BRAND_COLOR};letter-spacing:-0.5px;">
        OnSite Timekeeper
      </div>
      <div style="font-size:12px;color:${TEXT_SECONDARY};margin-top:2px;">
        Work Hours Report
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:11px;color:${TEXT_SECONDARY};">onsiteclub.ca</div>
    </div>
  </div>

  <!-- Worker Info -->
  <div style="margin-bottom:24px;">
    <div style="font-size:20px;font-weight:700;color:${TEXT_PRIMARY};">${model.worker.name}</div>
    ${model.worker.email ? `<div style="font-size:12px;color:${TEXT_SECONDARY};">${model.worker.email}</div>` : ''}
    <div style="font-size:14px;color:${TEXT_SECONDARY};margin-top:4px;">
      ${formatDate(model.period.start)} — ${formatDate(model.period.end)}
    </div>
  </div>

  <!-- Summary Stats -->
  <div style="display:flex;gap:16px;margin-bottom:24px;">
    <div style="flex:1;background:${BG_LIGHT};border-radius:8px;padding:16px;text-align:center;">
      <div style="font-size:24px;font-weight:800;color:${BRAND_COLOR};">${model.totals.hours}h ${model.totals.minutes}m</div>
      <div style="font-size:11px;color:${TEXT_SECONDARY};margin-top:2px;">Total Hours</div>
    </div>
    <div style="flex:1;background:${BG_LIGHT};border-radius:8px;padding:16px;text-align:center;">
      <div style="font-size:24px;font-weight:800;color:${TEXT_PRIMARY};">${model.totals.workDays}</div>
      <div style="font-size:11px;color:${TEXT_SECONDARY};margin-top:2px;">Work Days</div>
    </div>
    <div style="flex:1;background:${BG_LIGHT};border-radius:8px;padding:16px;text-align:center;">
      <div style="font-size:24px;font-weight:800;color:${TEXT_PRIMARY};">${formatDuration(model.totals.breakMinutes)}</div>
      <div style="font-size:11px;color:${TEXT_SECONDARY};margin-top:2px;">Total Breaks</div>
    </div>
    ${model.totals.overtimeHours > 0 ? `
    <div style="flex:1;background:#FEF2F2;border-radius:8px;padding:16px;text-align:center;">
      <div style="font-size:24px;font-weight:800;color:#DC2626;">${model.totals.overtimeHours}h</div>
      <div style="font-size:11px;color:#DC2626;margin-top:2px;">Overtime</div>
    </div>` : ''}
  </div>

  ${aiSummary ? renderAISummary(aiSummary) : ''}

  <!-- Daily Breakdown Table -->
  <table>
    <thead>
      <tr style="background:${TEXT_PRIMARY};">
        <th style="padding:10px 12px;text-align:left;color:white;font-weight:600;font-size:12px;">Date</th>
        <th style="padding:10px 12px;text-align:center;color:white;font-weight:600;font-size:12px;">In</th>
        <th style="padding:10px 12px;text-align:center;color:white;font-weight:600;font-size:12px;">Out</th>
        <th style="padding:10px 12px;text-align:center;color:white;font-weight:600;font-size:12px;">Break</th>
        <th style="padding:10px 12px;text-align:left;color:white;font-weight:600;font-size:12px;">Location</th>
        <th style="padding:10px 12px;text-align:right;color:white;font-weight:600;font-size:12px;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
    <tfoot>
      <tr style="background:${TEXT_PRIMARY};">
        <td colspan="5" style="padding:12px;color:white;font-weight:700;font-size:14px;">
          Grand Total
        </td>
        <td style="padding:12px;text-align:right;color:white;font-weight:700;font-size:14px;">
          ${model.totals.hours}h ${model.totals.minutes}m
        </td>
      </tr>
    </tfoot>
  </table>

  ${hasAICorrections ? `
  <div style="margin-top:16px;font-size:11px;color:${TEXT_SECONDARY};">
    <span style="color:${BRAND_COLOR};font-weight:600;">*</span>
    Times marked with an asterisk were adjusted by AI based on your work patterns.
    You can undo AI corrections in the app.
  </div>` : ''}

  <!-- Footer -->
  <div style="margin-top:32px;padding-top:16px;border-top:1px solid ${BORDER_COLOR};text-align:center;">
    <div style="font-size:11px;color:${TEXT_SECONDARY};">
      Generated by OnSite Timekeeper on ${today}
    </div>
    <div style="font-size:10px;color:${TEXT_SECONDARY};margin-top:2px;">
      OnSite Club &bull; onsiteclub.ca
    </div>
  </div>

</body>
</html>`;
}
