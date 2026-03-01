import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

/**
 * POST /api/push/send
 *
 * Sends push notifications to relevant users based on a timeline event.
 * Called after a message is mediated and the event_type is determined.
 *
 * Body: {
 *   event_type: string    — timeline event type
 *   jobsite_id: string       — site where event occurred
 *   lot_id?: string     — optional house context
 *   title: string         — notification title
 *   body: string          — notification body text
 *   data?: object         — extra data for the notification (e.g., request_id)
 *   sender_id?: string    — exclude sender from receiving their own notification
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event_type, jobsite_id, title, body: notifBody, data, sender_id } = body;

    if (!event_type || !jobsite_id || !title || !notifBody) {
      return NextResponse.json(
        { error: 'Missing required fields: event_type, jobsite_id, title, body' },
        { status: 400 },
      );
    }

    // Determine target app_names based on event type
    const targets = getTargetApps(event_type);
    if (targets.length === 0) {
      return NextResponse.json({ success: true, sent: 0, reason: 'no_targets' });
    }

    // Fetch push tokens for users at this site
    const tokens = await getTargetTokens(jobsite_id, targets, sender_id);

    if (tokens.length === 0) {
      return NextResponse.json({ success: true, sent: 0, reason: 'no_tokens' });
    }

    // Send via Expo Push API
    const messages = tokens.map((token) => ({
      to: token,
      title,
      body: notifBody,
      data: data || {},
      sound: 'default' as const,
      channelId: getChannelId(event_type),
    }));

    // Expo accepts up to 100 messages per request
    const chunks = chunkArray(messages, 100);
    let totalSent = 0;

    for (const chunk of chunks) {
      const response = await fetch(EXPO_PUSH_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      if (response.ok) {
        totalSent += chunk.length;
      } else {
        console.error('[push] Expo API error:', await response.text());
      }
    }

    return NextResponse.json({ success: true, sent: totalSent });
  } catch (error) {
    console.error('[push] Send error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Push send failed' },
      { status: 500 },
    );
  }
}

/**
 * Determine which app_names should receive push for a given event type.
 */
function getTargetApps(eventType: string): string[] {
  switch (eventType) {
    case 'material_request':
      return ['operator']; // Operator handles material deliveries
    case 'material_delivery':
    case 'material_issue':
      return ['monitor']; // Supervisor sees delivery confirmations
    case 'issue':
      return ['monitor']; // Supervisor sees issues
    case 'inspection':
      return ['timekeeper', 'operator']; // Workers and operators
    case 'status_change':
    case 'milestone':
      return ['monitor']; // Supervisor tracks progress
    case 'worker_arrival':
    case 'worker_departure':
      return ['monitor']; // Supervisor sees attendance
    case 'alert':
      return ['monitor', 'operator']; // Both supervisor and operator
    default:
      return []; // Notes, photos, etc. don't trigger push
  }
}

/**
 * Get the Android notification channel for an event type.
 */
function getChannelId(eventType: string): string {
  if (eventType === 'material_request' || eventType === 'material_delivery') {
    return 'material_requests';
  }
  if (eventType === 'alert' || eventType === 'issue') {
    return 'alerts';
  }
  return 'default';
}

/**
 * Fetch Expo push tokens for users associated with a site.
 */
async function getTargetTokens(
  siteId: string,
  appNames: string[],
  excludeUserId?: string,
): Promise<string[]> {
  // For 'monitor' target, get supervisors (site owners / org admins)
  // For 'operator', get operators assigned to the site
  // For 'timekeeper', get workers at the site

  const allTokens: string[] = [];

  if (appNames.includes('operator')) {
    // Get operators assigned to this site
    const { data: assignments } = await supabase
      .from('frm_operator_assignments')
      .select('operator_id')
      .eq('jobsite_id', siteId)
      .eq('is_active', true);

    if (assignments?.length) {
      const operatorIds = assignments
        .map((a: { operator_id: string }) => a.operator_id)
        .filter((id: string) => id !== excludeUserId);

      if (operatorIds.length > 0) {
        const { data: devices } = await supabase
          .from('core_devices')
          .select('push_token')
          .in('user_id', operatorIds)
          .eq('app_name', 'operator')
          .eq('push_enabled', true)
          .not('push_token', 'is', null);

        if (devices) {
          allTokens.push(
            ...devices
              .map((d: { push_token: string | null }) => d.push_token)
              .filter((t): t is string => !!t),
          );
        }
      }
    }
  }

  if (appNames.includes('monitor')) {
    // Get the site creator/org admins — for now, get all active admins
    // who have a push token registered for 'monitor' app
    const { data: site } = await supabase
      .from('frm_jobsites')
      .select('organization_id')
      .eq('id', siteId)
      .single();

    if (site?.organization_id) {
      const { data: admins } = await supabase
        .from('core_org_memberships')
        .select('user_id')
        .eq('organization_id', site.organization_id)
        .in('role', ['owner', 'admin', 'supervisor']);

      if (admins?.length) {
        const adminIds = admins
          .map((a: { user_id: string }) => a.user_id)
          .filter((id: string) => id !== excludeUserId);

        if (adminIds.length > 0) {
          // Monitor is a web app — push tokens would be for web push (future)
          // For now, this is a placeholder. Supervisors get mobile push via timekeeper.
          const { data: devices } = await supabase
            .from('core_devices')
            .select('push_token')
            .in('user_id', adminIds)
            .in('app_name', ['monitor', 'timekeeper'])
            .eq('push_enabled', true)
            .not('push_token', 'is', null);

          if (devices) {
            allTokens.push(
              ...devices
                .map((d: { push_token: string | null }) => d.push_token)
                .filter((t): t is string => !!t),
            );
          }
        }
      }
    }
  }

  if (appNames.includes('timekeeper')) {
    // Get workers at this site via org membership or geofence assignment
    const { data: site } = await supabase
      .from('frm_jobsites')
      .select('organization_id')
      .eq('id', siteId)
      .single();

    if (site?.organization_id) {
      const { data: workers } = await supabase
        .from('core_org_memberships')
        .select('user_id')
        .eq('organization_id', site.organization_id)
        .eq('role', 'worker');

      if (workers?.length) {
        const workerIds = workers
          .map((w: { user_id: string }) => w.user_id)
          .filter((id: string) => id !== excludeUserId);

        if (workerIds.length > 0) {
          const { data: devices } = await supabase
            .from('core_devices')
            .select('push_token')
            .in('user_id', workerIds)
            .eq('app_name', 'timekeeper')
            .eq('push_enabled', true)
            .not('push_token', 'is', null);

          if (devices) {
            allTokens.push(
              ...devices
                .map((d: { push_token: string | null }) => d.push_token)
                .filter((t): t is string => !!t),
            );
          }
        }
      }
    }
  }

  // Deduplicate tokens
  return [...new Set(allTokens)];
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
