/**
 * @onsite/agenda — Types for the shared Agenda/Calendar system.
 *
 * Two levels of agenda:
 * 1. Site-level: All events for a job site (inspections, deliveries, weather)
 * 2. House-level: Events for a specific house/lot (phase deadlines, tasks)
 *
 * Agenda is READ-ONLY for workers (Timekeeper, Operator).
 * Foreman (Monitor) can create/edit events.
 *
 * Data lives in `egl_external_events` (calendar events) and
 * `egl_schedule_phases` (phase deadlines).
 */

// ─── Agenda Event ───────────────────────────────────────────

export interface AgendaEvent {
  id: string;
  site_id: string;
  house_id: string | null;
  event_type: AgendaEventType;
  title: string;
  description: string | null;
  event_date: string; // YYYY-MM-DD
  start_time: string | null; // HH:MM
  end_time: string | null; // HH:MM
  duration_hours: number | null;
  source: AgendaEventSource;
  source_reference: string | null;
  impact_severity: ImpactSeverity | null;
  estimated_delay_days: number | null;
  verified: boolean;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
}

// ─── Event Types ────────────────────────────────────────────

export type AgendaEventType =
  // Weather
  | 'weather_snow'
  | 'weather_rain'
  | 'weather_cold'
  | 'weather_heat'
  | 'weather_wind'
  // Administrative
  | 'holiday'
  | 'permit_delay'
  | 'permit_approved'
  // Inspection
  | 'inspection_scheduled'
  | 'inspection_passed'
  | 'inspection_failed'
  | 'inspection_cancelled'
  // Material
  | 'material_delivery'
  | 'material_shortage'
  | 'material_order'
  // Worker
  | 'worker_assigned'
  | 'worker_absent'
  | 'worker_vacation'
  // Phase deadlines (from schedule)
  | 'phase_start'
  | 'phase_deadline'
  | 'phase_completed'
  // General
  | 'meeting'
  | 'task'
  | 'reminder'
  | 'other';

export type AgendaEventSource =
  | 'manual'
  | 'email_ai'
  | 'system'
  | 'schedule'
  | 'timekeeper'
  | 'operator'
  | 'weather_api';

export type ImpactSeverity = 'none' | 'minor' | 'medium' | 'major' | 'critical';

// ─── Phase Schedule ─────────────────────────────────────────

/** Derived from egl_schedule_phases — shown as deadlines on the agenda. */
export interface PhaseDeadline {
  id: string;
  schedule_id: string;
  phase_id: string;
  phase_name: string;
  house_id: string;
  lot_number: string;
  expected_start_date: string | null;
  expected_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  status: PhaseStatus;
}

export type PhaseStatus =
  | 'pending'
  | 'in_progress'
  | 'blocked'
  | 'inspection'
  | 'completed'
  | 'skipped';

// ─── View Modes ─────────────────────────────────────────────

export type AgendaView = 'day' | 'week' | 'month';

// ─── Fetch Options ──────────────────────────────────────────

export interface AgendaFetchOptions {
  site_id: string;
  house_id?: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  event_types?: AgendaEventType[];
}

// ─── Day Summary (for calendar dots/badges) ─────────────────

export interface AgendaDaySummary {
  date: string;
  event_count: number;
  has_critical: boolean;
  has_inspection: boolean;
  has_delivery: boolean;
  event_types: AgendaEventType[];
}
