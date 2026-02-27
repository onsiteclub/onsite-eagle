// ─── Tracking Engine ───────────────────────────────────────

export type TrackingStatus = 'IDLE' | 'TRACKING' | 'EXIT_PENDING';

export type TrackingSource = 'sdk' | 'headless' | 'watchdog' | 'gps_check' | 'manual' | 'voice';

export type SessionSource = 'gps' | 'manual' | 'voice' | 'edited' | 'secretary';

export interface TrackingEvent {
  type: 'enter' | 'exit';
  fenceId: string;
  occurredAt: string;
  receivedAt: string;
  source: TrackingSource;
  confidence: number;
  location?: { latitude: number; longitude: number; accuracy: number };
  delayMs: number;
}

export interface ActiveTracking {
  id: string;
  status: TrackingStatus;
  session_id: string | null;
  location_id: string | null;
  location_name: string | null;
  enter_at: string | null;
  exit_at: string | null;
  cooldown_expires_at: string | null;
  pause_seconds: number;
  updated_at: string;
}

// ─── Work Sessions ─────────────────────────────────────────

export interface WorkSession {
  id: string;
  user_id: string;
  location_id: string | null;
  location_name: string | null;
  enter_at: string;
  exit_at: string | null;
  break_seconds: number;
  duration_minutes: number | null;
  source: SessionSource;
  confidence: number;
  notes: string | null;
  meta: string | null;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
  deleted_at: string | null;
}

// ─── Day Summary ───────────────────────────────────────────

export type DayType = 'work' | 'rain' | 'snow' | 'sick' | 'dayoff' | 'holiday';

export type DayFlag = 'overtime' | 'no_break' | 'early_departure' | 'ai_corrected';

export interface DaySummary {
  id: string;
  user_id: string;
  date: string;
  total_minutes: number;
  break_minutes: number;
  first_entry: string | null;
  last_exit: string | null;
  sessions_count: number;
  primary_location: string | null;
  primary_location_id: string | null;
  type: DayType;
  flags: DayFlag[];
  source_mix: Record<string, number>;
  notes: string | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ─── Geofence Location ─────────────────────────────────────

export interface GeofenceLocation {
  id: string;
  user_id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  radius: number;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
  deleted_at: string | null;
}

// ─── AI Corrections ────────────────────────────────────────

export interface AICorrection {
  id: number;
  user_id: string;
  session_id: string | null;
  date: string;
  field: string;
  original_value: string | null;
  corrected_value: string | null;
  reason: string | null;
  source: string;
  reverted: boolean;
  created_at: string;
  synced_at: string | null;
}

// ─── Effects Queue ─────────────────────────────────────────

export type EffectType =
  | 'SWITCH_GPS_MODE'
  | 'NOTIFY_ARRIVAL' | 'NOTIFY_DEPARTURE' | 'NOTIFY_PAUSED' | 'NOTIFY_RESUMED'
  | 'REBUILD_DAY_SUMMARY'
  | 'START_SESSION_GUARD' | 'CANCEL_SESSION_GUARD'
  | 'SYNC_NOW'
  | 'AI_CLEANUP'
  | 'UI_REFRESH';

export interface QueuedEffect {
  id: number;
  effect_type: EffectType;
  payload: string | null;
  status: 'pending' | 'done' | 'failed';
  retry_count: number;
  next_run_at: string | null;
  priority: 'critical' | 'normal';
  created_at: string;
  executed_at: string | null;
}

// ─── Active Tracking State (UI-facing) ────────────────────

/**
 * Simplified tracking state for UI / voice AI consumption.
 * Derived from ActiveTracking but with friendlier field names.
 */
export interface ActiveTrackingState {
  status: TrackingStatus;
  session_id: string | null;
  fence_id: string | null;
  fence_name: string | null;
  enter_at: string | null;
  exit_at: string | null;
  pause_seconds: number;
}

// ─── Sync ──────────────────────────────────────────────────

export interface SyncStats {
  uploaded: Record<string, number>;
  downloaded: Record<string, number>;
  conflicts: number;
  errors: string[];
  duration_ms: number;
  timestamp: string;
}

export const SOURCE_PRIORITY: Record<string, number> = {
  voice: 4,
  manual: 3,
  edited: 3,
  secretary: 2,
  gps: 1,
  sdk: 1,
};

// ─── Reports ───────────────────────────────────────────────

export interface ReportModel {
  worker: { name: string; email: string };
  period: { start: string; end: string };
  days: ReportDay[];
  totals: {
    hours: number;
    minutes: number;
    workDays: number;
    breakMinutes: number;
    overtimeHours: number;
  };
  weeklyTotals: { weekStart: string; totalMinutes: number }[];
  aiSummary?: string;
}

export interface ReportDay {
  date: string;
  dayOfWeek: string;
  firstEntry: string;
  lastExit: string;
  totalMinutes: number;
  breakMinutes: number;
  locationName: string;
  type: DayType;
  flags: DayFlag[];
  source: SessionSource;
}
