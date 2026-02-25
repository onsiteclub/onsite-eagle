/**
 * @onsite/timeline — Types for the cross-app Timeline system.
 *
 * The Timeline is an AI-mediated event feed (WhatsApp-style) shared across
 * Monitor, Timekeeper, and Operator. Nobody chats directly — all text goes
 * through AI and becomes a typed event.
 *
 * Data lives in `egl_messages` (chat-style) and `egl_timeline` (events).
 */

// ─── Message (Chat-style feed) ──────────────────────────────

export type SenderType = 'worker' | 'supervisor' | 'operator' | 'ai' | 'system';

export interface TimelineMessage {
  id: string;
  site_id: string;
  house_id: string | null;
  sender_type: SenderType;
  sender_id: string | null;
  sender_name: string;
  sender_avatar_url: string | null;
  content: string;
  attachments: MessageAttachment[];
  is_ai_response: boolean;
  ai_question: string | null;
  phase_at_creation: number;
  source_app: SourceApp | null;
  created_at: string;
}

export interface MessageAttachment {
  type: 'photo' | 'document' | 'plan';
  url: string;
  thumbnail_url?: string;
  name?: string;
}

export type SourceApp = 'monitor' | 'timekeeper' | 'operator';

// ─── AI Mediation ───────────────────────────────────────────

/** Input: raw text from any app. Output: typed event(s). */
export interface AIMediationInput {
  text: string;
  sender_type: SenderType;
  sender_id: string;
  sender_name: string;
  site_id: string;
  house_id?: string;
  source_app: SourceApp;
}

/** What the AI mediator returns after interpreting a message. */
export interface AIMediationResult {
  /** The event to create in the timeline */
  event: {
    event_type: TimelineEventType;
    title: string;
    description: string;
  };
  /** Optional: material request detected */
  material_request?: {
    material_name: string;
    quantity?: number;
    unit?: string;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    house_id?: string;
  };
  /** Optional: alert to send to foreman */
  alert?: {
    title: string;
    severity: 'info' | 'warning' | 'critical';
    target_role: SenderType;
  };
  /** Optional: calendar event detected */
  calendar_event?: {
    title: string;
    date: string;
    event_type: string;
  };
  /** AI's confidence in the interpretation (0-1) */
  confidence: number;
  /** The cleaned/translated message to show in the feed */
  display_text: string;
}

// ─── Message Analysis (Monitor AI features) ─────────────────

export interface MessageAnalysis {
  should_respond: boolean;
  response: string | null;
  detected_updates: {
    phase_change: number | null;
    progress_change: number | null;
    status_change: string | null;
  };
  detected_issues: Array<{ title: string; severity: string; description: string }>;
  detected_events: Array<{ title: string; date: string | null; type: string }>;
  confidence: number;
  reasoning: string;
}

// ─── Timeline Event Types ───────────────────────────────────

export type TimelineEventType =
  | 'photo'
  | 'email'
  | 'calendar'
  | 'note'
  | 'alert'
  | 'ai_validation'
  | 'status_change'
  | 'issue'
  | 'inspection'
  | 'assignment'
  | 'milestone'
  | 'document'
  | 'material_request'
  | 'material_delivery'
  | 'material_issue'
  | 'worker_arrival'
  | 'worker_departure';

// ─── Fetch/Subscribe Options ────────────────────────────────

export interface TimelineFetchOptions {
  site_id: string;
  house_id?: string;
  limit?: number;
  offset?: number;
  before?: string;
  after?: string;
}

export interface TimelineSubscribeOptions {
  site_id: string;
  house_id?: string;
  onMessage: (message: TimelineMessage) => void;
}

// ─── Sender Config (for UI rendering) ───────────────────────

export interface SenderConfig {
  color: string;
  bgColor: string;
  label: string;
  icon: string; // Icon name (lucide for web, ionicons for native)
}

// ─── Minimal Supabase interface ─────────────────────────────

export interface SupabaseClient {
  from: (table: string) => unknown;
  channel: (name: string) => unknown;
  removeChannel: (channel: unknown) => void;
}
