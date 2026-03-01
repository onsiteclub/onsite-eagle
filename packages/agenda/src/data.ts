/**
 * @onsite/agenda — Data layer for Agenda events.
 *
 * Fetches from `frm_external_events` (calendar events) and
 * `frm_schedule_phases` (phase deadlines).
 *
 * All functions accept supabase client as parameter.
 */

import type {
  AgendaEvent,
  AgendaFetchOptions,
  AgendaDaySummary,
  PhaseDeadline,
} from './types';

// ─── Fetch Agenda Events ────────────────────────────────────

/**
 * Fetch agenda events for a date range.
 * Combines external events + phase deadlines into a unified list.
 */
export async function fetchAgendaEvents(
  supabase: { from: (table: string) => unknown },
  options: AgendaFetchOptions,
): Promise<{ data: AgendaEvent[]; error: string | null }> {
  const { jobsite_id, lot_id, start_date, end_date, event_types } = options;

  try {
    // Build query for frm_external_events
    let query = (supabase.from('frm_external_events') as {
      select: (s: string) => unknown;
    }).select('*') as {
      eq: (col: string, val: string) => unknown;
      gte: (col: string, val: string) => unknown;
      lte: (col: string, val: string) => unknown;
      in: (col: string, val: string[]) => unknown;
      order: (col: string, opts: { ascending: boolean }) => unknown;
    };

    query = query.eq('jobsite_id', jobsite_id) as typeof query;
    query = query.gte('event_date', start_date) as typeof query;
    query = query.lte('event_date', end_date) as typeof query;

    if (lot_id) {
      query = query.eq('lot_id', lot_id) as typeof query;
    }

    if (event_types && event_types.length > 0) {
      query = query.in('event_type', event_types) as typeof query;
    }

    query = query.order('event_date', { ascending: true }) as typeof query;

    const result = await (query as unknown as Promise<{ data: AgendaEvent[] | null; error: { message: string } | null }>);

    if (result.error) return { data: [], error: result.error.message };
    return { data: result.data || [], error: null };
  } catch (err) {
    return { data: [], error: String(err) };
  }
}

// ─── Fetch Phase Deadlines ──────────────────────────────────

/**
 * Fetch phase deadlines for houses in a site.
 * These appear on the agenda as phase_start/phase_deadline events.
 */
export async function fetchPhaseDeadlines(
  supabase: { from: (table: string) => unknown },
  jobsite_id: string,
  start_date: string,
  end_date: string,
): Promise<{ data: PhaseDeadline[]; error: string | null }> {
  try {
    const query = (supabase.from('frm_schedule_phases') as {
      select: (s: string) => unknown;
    }).select(`
      id, schedule_id, phase_id, status,
      expected_start_date, expected_end_date,
      actual_start_date, actual_end_date,
      frm_schedules!inner(lot_id, frm_lots!inner(lot_number, jobsite_id)),
      ref_eagle_phases!inner(name)
    `) as {
      gte: (col: string, val: string) => unknown;
      lte: (col: string, val: string) => unknown;
    };

    // Filter by date range (expected_start or expected_end within range)
    const filtered = query.gte('expected_start_date', start_date) as typeof query;
    const result = await (filtered.lte('expected_start_date', end_date) as unknown as Promise<{
      data: unknown[] | null;
      error: { message: string } | null;
    }>);

    if (result.error) return { data: [], error: result.error.message };

    // Transform to PhaseDeadline shape
    const deadlines: PhaseDeadline[] = (result.data || []).map((row: unknown) => {
      const r = row as Record<string, unknown>;
      const schedule = r.frm_schedules as Record<string, unknown>;
      const lot = schedule?.frm_lots as Record<string, unknown>;
      const phase = r.ref_eagle_phases as Record<string, unknown>;

      return {
        id: r.id as string,
        schedule_id: r.schedule_id as string,
        phase_id: r.phase_id as string,
        phase_name: (phase?.name as string) || 'Unknown',
        lot_id: (schedule?.lot_id as string) || '',
        lot_number: (lot?.lot_number as string) || '',
        expected_start_date: r.expected_start_date as string | null,
        expected_end_date: r.expected_end_date as string | null,
        actual_start_date: r.actual_start_date as string | null,
        actual_end_date: r.actual_end_date as string | null,
        status: r.status as PhaseDeadline['status'],
      };
    });

    return { data: deadlines, error: null };
  } catch (err) {
    return { data: [], error: String(err) };
  }
}

// ─── Create Agenda Event ────────────────────────────────────

export interface CreateAgendaEventInput {
  jobsite_id: string;
  lot_id?: string;
  event_type: string;
  title: string;
  description?: string;
  event_date: string;
  start_time?: string;
  end_time?: string;
  duration_hours?: number;
  source: string;
  source_reference?: string;
  impact_severity?: string;
  estimated_delay_days?: number;
  metadata?: Record<string, unknown>;
  created_by?: string;
}

/**
 * Create a new agenda event.
 * Used by: Monitor (manual), Email AI (auto), Timekeeper (auto from tracking).
 */
export async function createAgendaEvent(
  supabase: { from: (table: string) => { insert: (data: unknown) => { select: () => Promise<{ data: unknown; error: unknown }> } } },
  input: CreateAgendaEventInput,
): Promise<{ data: AgendaEvent | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('frm_external_events')
      .insert({
        jobsite_id: input.jobsite_id,
        lot_id: input.lot_id || null,
        event_type: input.event_type,
        title: input.title,
        description: input.description || null,
        event_date: input.event_date,
        start_time: input.start_time || null,
        end_time: input.end_time || null,
        duration_hours: input.duration_hours || null,
        source: input.source,
        source_reference: input.source_reference || null,
        impact_severity: input.impact_severity || null,
        estimated_delay_days: input.estimated_delay_days || null,
        metadata: input.metadata || null,
        created_by: input.created_by || null,
      })
      .select() as { data: AgendaEvent[] | null; error: { message: string } | null };

    if (error) return { data: null, error: error.message };
    return { data: data?.[0] || null, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

// ─── Day Summaries (for calendar badges) ────────────────────

/**
 * Get a summary of events per day for a date range.
 * Used to show dots/badges on the calendar.
 */
export function buildDaySummaries(events: AgendaEvent[]): AgendaDaySummary[] {
  const byDate: Record<string, AgendaEvent[]> = {};

  for (const event of events) {
    if (!byDate[event.event_date]) byDate[event.event_date] = [];
    byDate[event.event_date].push(event);
  }

  return Object.entries(byDate).map(([date, dayEvents]) => ({
    date,
    event_count: dayEvents.length,
    has_critical: dayEvents.some(e => e.impact_severity === 'critical' || e.impact_severity === 'major'),
    has_inspection: dayEvents.some(e => e.event_type.startsWith('inspection')),
    has_delivery: dayEvents.some(e => e.event_type === 'material_delivery'),
    event_types: [...new Set(dayEvents.map(e => e.event_type))],
  }));
}
