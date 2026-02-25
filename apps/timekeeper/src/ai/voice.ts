/**
 * Voice AI — Process voice commands and execute actions.
 *
 * Pipeline: Mic → expo-av records .m4a → base64 → ai-whisper (Whisper)
 *   → transcript → processVoiceCommand() → AI interprets → executeVoiceAction()
 *
 * Voice edits are HIGHEST priority (source='voice').
 *
 * Spec: 07-AI.md "Voice AI"
 */
import { callAI, transcribeAudio } from '@onsite/ai';
import type { AIResponse } from '@onsite/ai';
import { getUserId } from '@onsite/auth/core';
import { logger } from '@onsite/logger';
import { supabase } from '../lib/supabase';
import { getDb } from '../lib/database';
import { buildWorkerProfile } from './profile';
import { editSession } from '../usecases/editSession';
import { deleteSession } from '../usecases/deleteSession';
import { createManualSession } from '../usecases/createManualSession';
import { markAbsence } from '../usecases/markAbsence';
import { pauseSession, resumeSession } from '../usecases/pauseResume';
import { createFence, deleteFence } from '../usecases/manageFence';
import { generateReport } from '../usecases/generateReport';
import { handleEvent } from '../tracking/engine';
import type { ActiveTrackingState, DaySummary } from '@onsite/shared';
import type { AbsenceType } from '../usecases/markAbsence';

// ─── Types ─────────────────────────────────────────────────

export interface VoiceAppState {
  tracking: ActiveTrackingState;
  todaySummary: DaySummary | null;
}

export interface VoiceResult {
  action: string;
  response_text: string;
  success: boolean;
}

interface DaySummaryRow {
  date: string;
  total_minutes: number;
  break_minutes: number;
  type: string;
  sessions_count: number;
  primary_location: string | null;
}

interface FenceRow {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
}

// ─── Date Reference Table ──────────────────────────────────

/**
 * Build a date reference table so the AI never needs to do date math.
 * Pre-calculates: today, yesterday, "last Monday", day names, etc.
 */
function buildDateReferenceTable(): Record<string, string> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDow = now.getDay();

  const table: Record<string, string> = {
    today: today,
    yesterday: yesterday.toISOString().slice(0, 10),
    today_day_name: dayNames[todayDow],
  };

  // Last 7 days by name: "last_monday", "last_tuesday", etc.
  for (let i = 1; i <= 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const name = dayNames[d.getDay()].toLowerCase();
    // Only set if not already set (closest day wins)
    if (!table[`last_${name}`]) {
      table[`last_${name}`] = d.toISOString().slice(0, 10);
    }
  }

  // This week Monday
  const monday = new Date(now);
  const diff = todayDow === 0 ? -6 : 1 - todayDow;
  monday.setDate(monday.getDate() + diff);
  table.this_week_start = monday.toISOString().slice(0, 10);

  // Last week
  const lastMonday = new Date(monday);
  lastMonday.setDate(lastMonday.getDate() - 7);
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastSunday.getDate() + 6);
  table.last_week_start = lastMonday.toISOString().slice(0, 10);
  table.last_week_end = lastSunday.toISOString().slice(0, 10);

  return table;
}

// ─── Context Builder ───────────────────────────────────────

/**
 * Build the full context object sent to the Voice AI.
 */
async function buildVoiceContext(
  appState: VoiceAppState,
  userId: string,
): Promise<Record<string, unknown>> {
  const db = getDb();

  // Recent day summaries (last 7 days)
  const recentDays = await db.getAllAsync<DaySummaryRow>(`
    SELECT date, total_minutes, break_minutes, type, sessions_count, primary_location
    FROM day_summary
    WHERE user_id = ? AND date >= date('now', '-7 days') AND deleted_at IS NULL
    ORDER BY date DESC
  `, [userId]);

  // Registered locations
  const locations = await db.getAllAsync<FenceRow>(`
    SELECT id, name, latitude, longitude, radius
    FROM geofence_locations
    WHERE user_id = ? AND deleted_at IS NULL
    ORDER BY name ASC
  `, [userId]);

  // Worker profile
  const profile = await buildWorkerProfile(userId);

  return {
    app_state: {
      status: appState.tracking.status,
      current_site: appState.tracking.fence_name || null,
      session_id: appState.tracking.session_id || null,
      elapsed_minutes: appState.todaySummary?.total_minutes || 0,
    },
    recent_days: recentDays.map((d) => ({
      date: d.date,
      hours: Math.round((d.total_minutes / 60) * 10) / 10,
      break_min: d.break_minutes,
      type: d.type,
      sessions: d.sessions_count,
      location: d.primary_location,
    })),
    locations: locations.map((l) => ({
      id: l.id,
      name: l.name,
    })),
    worker_profile: profile,
    date_reference: buildDateReferenceTable(),
  };
}

// ─── Transcribe ────────────────────────────────────────────

/**
 * Transcribe audio via Whisper edge function.
 * Returns the transcript text, or null on failure.
 */
export async function transcribeVoice(base64Audio: string): Promise<string | null> {
  const result = await transcribeAudio(base64Audio, supabase);
  if (!result || !result.text) {
    logger.warn('AI', 'Voice transcription failed or empty');
    return null;
  }

  logger.info('AI', 'Voice transcribed', {
    text: result.text.slice(0, 100),
    language: result.language,
    duration_ms: result.duration_ms,
  });

  return result.text;
}

// ─── Process Command ───────────────────────────────────────

/**
 * Process a voice transcript through the Voice AI specialist.
 * Returns the AI response with action + data + response_text.
 */
export async function processVoiceCommand(
  transcript: string,
  appState: VoiceAppState,
): Promise<AIResponse> {
  const userId = await getUserId();
  if (!userId) {
    return { action: 'error', data: {}, response_text: 'Not logged in.' };
  }

  const context = await buildVoiceContext(appState, userId);

  const response = await callAI(
    {
      specialist: 'timekeeper:voice',
      context: {
        ...context,
        transcript,
      },
    },
    supabase,
  );

  logger.info('AI', 'Voice command processed', {
    transcript: transcript.slice(0, 80),
    action: response.action,
  });

  return response;
}

// ─── Execute Action ────────────────────────────────────────

/**
 * Execute a voice AI action by dispatching to the appropriate use case.
 * Returns a VoiceResult with success status.
 */
export async function executeVoiceAction(response: AIResponse): Promise<VoiceResult> {
  const userId = await getUserId();
  if (!userId) {
    return { action: 'error', response_text: 'Not logged in.', success: false };
  }

  const { action, data } = response;
  const d = data as Record<string, unknown>;

  try {
    switch (action) {
      case 'update_record': {
        await editSession({
          sessionId: d.session_id as string | undefined,
          date: d.date as string | undefined,
          userId,
          changes: d.changes as { enter_at?: string; exit_at?: string; break_seconds?: number; notes?: string },
          source: 'voice',
          reason: d.reason as string | undefined,
        });
        break;
      }

      case 'delete_record': {
        await deleteSession(
          userId,
          d.session_id as string | undefined,
          d.date as string | undefined,
        );
        break;
      }

      case 'start': {
        await createManualSession({
          date: d.date as string,
          enterTime: d.enter_time as string,
          exitTime: d.exit_time as string,
          breakMinutes: (d.break_minutes as number) || 0,
          locationName: d.location_name as string | undefined,
          source: 'voice',
          notes: d.notes as string | undefined,
        });
        break;
      }

      case 'stop': {
        await handleEvent({
          type: 'EXIT',
          timestamp: new Date().toISOString(),
          source: 'manual',
        });
        break;
      }

      case 'pause': {
        await pauseSession();
        break;
      }

      case 'resume': {
        await resumeSession();
        break;
      }

      case 'query': {
        // Read-only — AI already put the answer in response_text
        break;
      }

      case 'send_report': {
        await generateReport({
          startDate: d.start_date as string,
          endDate: d.end_date as string,
          format: (d.format as 'pdf' | 'whatsapp' | 'text') || 'text',
        });
        break;
      }

      case 'create_location': {
        await createFence({
          name: d.name as string,
          latitude: d.latitude as number,
          longitude: d.longitude as number,
          radius: d.radius as number | undefined,
        });
        break;
      }

      case 'delete_location': {
        await deleteFence(d.fence_id as string);
        break;
      }

      case 'mark_day_type': {
        await markAbsence(
          d.date as string,
          d.type as AbsenceType,
          d.notes as string | undefined,
        );
        break;
      }

      case 'navigate': {
        // Navigation handled by the UI layer that calls executeVoiceAction.
        // We just return the screen name in the response.
        break;
      }

      case 'error': {
        return {
          action: 'error',
          response_text: response.response_text || 'AI unavailable.',
          success: false,
        };
      }

      default: {
        logger.warn('AI', 'Unknown voice action', { action });
        return {
          action,
          response_text: response.response_text || 'I didn\'t understand that.',
          success: false,
        };
      }
    }

    logger.info('AI', 'Voice action executed', { action });
    return {
      action,
      response_text: response.response_text,
      success: true,
    };
  } catch (error) {
    logger.error('AI', 'Voice action failed', { action, error: String(error) });
    return {
      action,
      response_text: 'Something went wrong. Try again.',
      success: false,
    };
  }
}
