/**
 * Tracking Store — Zustand store for reactive UI state.
 *
 * Reads from SQLite (active_tracking + work_sessions) and exposes
 * reactive state for the Home screen timer and status indicators.
 */
import { create } from 'zustand';
import type { ActiveTracking, WorkSession } from '@onsite/shared';
import { getActiveTracking } from '../persistence/activeTracking';
import { getSessionsForDate } from '../persistence/sessions';
import { getUserId } from '@onsite/auth/core';
import { logger } from '@onsite/logger';

interface TrackingState {
  // Active tracking
  status: ActiveTracking['status'];
  sessionId: string | null;
  locationName: string | null;
  enterAt: string | null;
  exitAt: string | null;
  cooldownExpiresAt: string | null;
  pauseSeconds: number;
  isPaused: boolean;

  // Today's sessions
  todaySessions: WorkSession[];
  todayTotalMinutes: number;

  // Loading
  isLoading: boolean;

  // Actions
  refresh: () => Promise<void>;
}

function todayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const useTrackingStore = create<TrackingState>((set) => ({
  status: 'IDLE',
  sessionId: null,
  locationName: null,
  enterAt: null,
  exitAt: null,
  cooldownExpiresAt: null,
  pauseSeconds: 0,
  isPaused: false,
  todaySessions: [],
  todayTotalMinutes: 0,
  isLoading: true,

  refresh: async () => {
    try {
      const state = await getActiveTracking();
      const userId = await getUserId();

      let todaySessions: WorkSession[] = [];
      let todayTotalMinutes = 0;

      if (userId) {
        todaySessions = await getSessionsForDate(userId, todayDate());
        todayTotalMinutes = todaySessions.reduce(
          (sum, s) => sum + (s.duration_minutes || 0),
          0,
        );
      }

      // Check if currently paused (meta has pause_start_at)
      let isPaused = false;
      if (state.status === 'TRACKING' && state.session_id) {
        const currentSession = todaySessions.find((s) => s.id === state.session_id);
        if (currentSession?.meta) {
          try {
            const meta = JSON.parse(currentSession.meta);
            isPaused = !!meta.pause_start_at;
          } catch { /* ignore */ }
        }
      }

      set({
        status: state.status,
        sessionId: state.session_id,
        locationName: state.location_name,
        enterAt: state.enter_at,
        exitAt: state.exit_at,
        cooldownExpiresAt: state.cooldown_expires_at,
        pauseSeconds: state.pause_seconds,
        isPaused,
        todaySessions,
        todayTotalMinutes,
        isLoading: false,
      });
    } catch (error) {
      logger.warn('STORE', 'Tracking store refresh failed', { error: String(error) });
      set({ isLoading: false });
    }
  },
}));
