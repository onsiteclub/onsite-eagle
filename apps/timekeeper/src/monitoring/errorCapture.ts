/**
 * Error Capture — Structured error logging to SQLite + Sentry.
 *
 * Errors are stored locally in error_log, uploaded to Supabase via sync,
 * and sent to Sentry immediately.
 *
 * Spec: 09-MONITORING.md "Error Log"
 */
import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { getDb } from '../lib/database';
import { generateUUID } from '@onsite/utils/uuid';
import { getUserId } from '@onsite/auth/core';
import { logger } from '@onsite/logger';

/**
 * Capture a structured error to SQLite + Sentry.
 *
 * @param type Error category (e.g., 'sync_upload', 'sdk_init', 'ai_call')
 * @param message Human-readable error message
 * @param context Additional context data
 */
export async function captureError(
  type: string,
  message: string,
  context?: Record<string, unknown>,
): Promise<void> {
  try {
    const db = getDb();
    const userId = await getUserId();
    const appVersion = Application.nativeApplicationVersion || 'unknown';
    const os = Platform.OS;
    const deviceModel = Device.modelName || 'unknown';

    // 1. Store in local SQLite
    await db.runAsync(`
      INSERT INTO error_log (id, user_id, error_type, error_message, error_context,
        app_version, os, device_model, occurred_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      generateUUID(),
      userId,
      type,
      message,
      context ? JSON.stringify(context) : null,
      appVersion,
      os,
      deviceModel,
    ]);

    // 2. Send to Sentry
    Sentry.captureMessage(message, {
      level: 'error',
      tags: { error_type: type },
      extra: context as Record<string, string>,
    });

    // 3. Log locally
    logger.error('ERROR', message, { type, ...context });
  } catch (err) {
    // Error capture must never throw — last resort console
    console.error('[ErrorCapture] Failed to capture error:', err);
  }
}

/**
 * Capture an exception (with stack trace) to Sentry + local log.
 */
export async function captureException(
  error: unknown,
  type: string,
  context?: Record<string, unknown>,
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  try {
    const db = getDb();
    const userId = await getUserId();
    const appVersion = Application.nativeApplicationVersion || 'unknown';

    await db.runAsync(`
      INSERT INTO error_log (id, user_id, error_type, error_message, error_stack, error_context,
        app_version, os, device_model, occurred_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      generateUUID(),
      userId,
      type,
      message,
      stack || null,
      context ? JSON.stringify(context) : null,
      appVersion,
      Platform.OS,
      Device.modelName || 'unknown',
    ]);

    Sentry.captureException(error, {
      tags: { error_type: type },
      extra: context as Record<string, string>,
    });

    logger.error('ERROR', message, { type, stack: stack?.slice(0, 200), ...context });
  } catch (err) {
    console.error('[ErrorCapture] Failed to capture exception:', err);
  }
}
