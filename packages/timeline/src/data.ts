/**
 * @onsite/timeline — Data layer for Timeline messages.
 *
 * Pure functions that accept a Supabase client as parameter.
 * No global state, no React — works in any JS environment.
 *
 * Table: `egl_messages` (chat-style feed)
 */

import type {
  TimelineMessage,
  TimelineFetchOptions,
  TimelineSubscribeOptions,
  SenderType,
  SourceApp,
  MessageAttachment,
} from './types';

// ─── Fetch Messages ─────────────────────────────────────────

interface SupabaseQueryBuilder {
  select: (columns: string) => SupabaseQueryBuilder;
  eq: (column: string, value: string) => SupabaseQueryBuilder;
  is: (column: string, value: null) => SupabaseQueryBuilder;
  lt: (column: string, value: string) => SupabaseQueryBuilder;
  gt: (column: string, value: string) => SupabaseQueryBuilder;
  order: (column: string, options: { ascending: boolean }) => SupabaseQueryBuilder;
  limit: (count: number) => SupabaseQueryBuilder;
  range: (from: number, to: number) => SupabaseQueryBuilder;
}

/**
 * Fetch timeline messages for a site or specific house.
 * If house_id is provided, returns only that house's messages.
 * If omitted, returns site-level messages (house_id IS NULL).
 */
export async function fetchMessages(
  supabase: { from: (table: string) => SupabaseQueryBuilder },
  options: TimelineFetchOptions,
): Promise<{ data: TimelineMessage[]; error: string | null }> {
  const { site_id, house_id, limit = 100, offset = 0, before, after } = options;

  try {
    let query = supabase
      .from('egl_messages')
      .select('*')
      .eq('site_id', site_id)
      .order('created_at', { ascending: true });

    if (house_id) {
      query = query.eq('house_id', house_id);
    } else {
      query = query.is('house_id', null);
    }

    if (before) {
      query = query.lt('created_at', before);
    }

    if (after) {
      query = query.gt('created_at', after);
    }

    if (offset > 0) {
      query = query.range(offset, offset + limit - 1);
    } else {
      query = query.limit(limit);
    }

    const result = await (query as unknown as Promise<{ data: TimelineMessage[] | null; error: { message: string } | null }>);
    const { data, error } = result as { data: TimelineMessage[] | null; error: { message: string } | null };

    if (error) return { data: [], error: error.message };
    return { data: data || [], error: null };
  } catch (err) {
    return { data: [], error: String(err) };
  }
}

// ─── Send Message ───────────────────────────────────────────

export interface SendMessageInput {
  site_id: string;
  house_id?: string;
  sender_type: SenderType;
  sender_id?: string;
  sender_name: string;
  content: string;
  attachments?: MessageAttachment[];
  is_ai_response?: boolean;
  ai_question?: string;
  phase_at_creation?: number;
  source_app: SourceApp;
}

/**
 * Send a message to the timeline.
 * In the AI-mediated flow, this is called AFTER the AI mediator
 * processes the raw text and produces a typed event.
 */
export async function sendMessage(
  supabase: { from: (table: string) => { insert: (data: unknown) => { select: () => Promise<{ data: unknown; error: unknown }> } } },
  input: SendMessageInput,
): Promise<{ data: TimelineMessage | null; error: string | null }> {
  try {
    const senderType = input.sender_type === 'operator' ? 'worker' : input.sender_type;

    const { data, error } = await supabase
      .from('egl_messages')
      .insert({
        site_id: input.site_id,
        house_id: input.house_id || null,
        sender_type: senderType,
        sender_id: input.sender_id || null,
        sender_name: input.sender_name,
        content: input.content,
        attachments: input.attachments || [],
        is_ai_response: input.is_ai_response || false,
        ai_question: input.ai_question || null,
        phase_at_creation: input.phase_at_creation || 1,
      })
      .select() as { data: TimelineMessage[] | null; error: { message: string } | null };

    if (error) return { data: null, error: error.message };
    return { data: data?.[0] || null, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

// ─── Subscribe to Realtime ──────────────────────────────────

/**
 * Subscribe to realtime message inserts on a site/house channel.
 * Returns an unsubscribe function.
 */
export function subscribeToMessages(
  supabase: {
    channel: (name: string) => {
      on: (event: string, config: unknown, callback: (payload: { new: TimelineMessage }) => void) => { subscribe: () => unknown };
    };
    removeChannel: (channel: unknown) => void;
  },
  options: TimelineSubscribeOptions,
): () => void {
  const { site_id, house_id, onMessage } = options;
  const channelName = `timeline-${site_id}-${house_id || 'site'}`;

  const filter = house_id
    ? `house_id=eq.${house_id}`
    : `site_id=eq.${site_id}`;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'egl_messages',
        filter,
      },
      (payload: { new: TimelineMessage }) => {
        if (house_id) {
          if (payload.new.house_id === house_id) onMessage(payload.new);
          return;
        }

        if (!payload.new.house_id) onMessage(payload.new);
      },
    )
    .subscribe();

  // Return cleanup function
  return () => {
    supabase.removeChannel(channel);
  };
}

// ─── AI Mediation ───────────────────────────────────────────

export interface MediationRequest {
  message_id?: string;
  message: string;
  site_id: string;
  house_id?: string;
  sender_type: SenderType;
  sender_id?: string;
  sender_name: string;
  source_app: SourceApp;
}

/**
 * Request AI mediation for a message.
 *
 * Call this AFTER sendMessage() to interpret the raw text into a typed event.
 * The API will update the egl_messages row with ai_interpretation.
 *
 * @param apiBaseUrl - Base URL of the Monitor app (e.g., "https://monitor.onsiteclub.ca")
 * @param input - Message data to mediate
 * @returns Mediation result or null on failure (fallback: message stays as 'note')
 */
export async function requestMediation(
  apiBaseUrl: string,
  input: MediationRequest,
): Promise<{ success: boolean; result: unknown; error?: string }> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/timeline/mediate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      return { success: false, result: null, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { success: data.success ?? true, result: data.result ?? null };
  } catch (err) {
    // Mediation failure is non-fatal — message stays as 'note'
    return { success: false, result: null, error: String(err) };
  }
}

// ─── Helpers ────────────────────────────────────────────────

/** Group messages by date string (for date dividers in UI). */
export function groupMessagesByDate(messages: TimelineMessage[]): Record<string, TimelineMessage[]> {
  return messages.reduce((groups, message) => {
    const date = new Date(message.created_at).toDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(message);
    return groups;
  }, {} as Record<string, TimelineMessage[]>);
}

/** Format a timestamp for display in the timeline. */
export function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });
}

/** Format a date for the date divider. */
export function formatDateDivider(dateStr: string): string {
  const date = new Date(dateStr);
  const weekday = date.toLocaleDateString('en-CA', { weekday: 'short' });
  const formatted = date.toLocaleDateString('en-CA'); // YYYY-MM-DD
  return `${formatted} (${weekday})`;
}

/** Count messages for badge updates. */
export async function fetchMessageCount(
  supabase: {
    from: (table: string) => {
      select: (columns: string, options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) => SupabaseQueryBuilder;
    };
  },
  site_id: string,
  since?: string,
): Promise<{ count: number; error: string | null }> {
  try {
    let query = supabase
      .from('egl_messages')
      .select('*', { count: 'exact', head: true })
      .eq('site_id', site_id) as unknown as SupabaseQueryBuilder;

    if (since) {
      query = query.gt('created_at', since);
    }

    const result = await (query as unknown as Promise<{ count: number | null; error: { message: string } | null }>);

    if (result.error) return { count: 0, error: result.error.message };
    return { count: result.count || 0, error: null };
  } catch (err) {
    return { count: 0, error: String(err) };
  }
}
