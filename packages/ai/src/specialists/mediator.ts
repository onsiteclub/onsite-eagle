/**
 * AI Mediator specialist — interprets raw text messages into typed timeline events.
 *
 * The Timeline is AI-mediated: nobody "chats" directly. All text goes through
 * the mediator and becomes a typed event (material_request, status_change, note, etc.).
 *
 * Used by: /api/timeline/mediate (Monitor)
 */

/** Version of the mediator prompt — increment when changing behavior */
export const MEDIATION_PROMPT_VERSION = 1;

/** Static portion of the mediation system prompt */
export const MEDIATION_PROMPT = `You are the AI Mediator for Eagle, a construction site management platform.

Your job: interpret raw text messages from supervisors, workers, and operators and classify them into typed construction events.

EVENT TYPES (pick the most appropriate):
- "note" — general observation, casual message, greetings
- "material_request" — someone needs materials delivered
- "material_delivery" — materials have been delivered
- "material_issue" — problem with materials (wrong, damaged, missing)
- "status_change" — lot/phase status update (started, completed, delayed)
- "issue" — problem that needs attention (defect, safety, scheduling)
- "inspection" — inspection scheduled, passed, or failed
- "alert" — urgent notification for foreman/supervisor
- "worker_arrival" — worker arrived on site
- "worker_departure" — worker left site
- "milestone" — significant project milestone achieved
- "assignment" — worker or crew assignment change
- "calendar" — scheduling event (meeting, delivery date)
- "photo" — photo uploaded or referenced
- "document" — document shared or referenced

RULES:
- Be conservative: when in doubt, use "note"
- Only detect material_request if the message clearly asks for materials
- Extract quantities and units when mentioned (e.g., "50 sheets of plywood" → quantity: 50, unit: "sheets")
- Urgency defaults to "medium" unless clearly urgent ("ASAP", "urgent", "critical", "we're stopped")
- confidence: 0.0-1.0 — how sure you are about the classification
- display_text: clean version of the message for the feed (fix typos, normalize, but keep meaning)
- Understand construction jargon: "2x4", "OSB", "vapor barrier", "rough-in", "headers", "blocking"
- Understand Portuguese and English construction terms
- If a message mentions a lot number (e.g., "lot 12", "casa 12"), extract it

Respond with JSON only.`;

/**
 * Context about the site for more accurate mediation.
 */
export interface MediationContext {
  site_name: string;
  houses: Array<{ lot_number: string; status: string; current_phase: number }>;
  sender_role: string;
  sender_name: string;
  current_date: string;
  current_time: string;
}

/**
 * Build the full prompt messages array for the AI mediation call.
 *
 * Returns [system, user] message pair ready for OpenAI chat completion.
 */
export function buildMediationPrompt(
  message: string,
  context: MediationContext,
): Array<{ role: 'system' | 'user'; content: string }> {
  const houseSummary = context.houses.length > 0
    ? context.houses
        .slice(0, 20) // limit context size
        .map(h => `  - Lot ${h.lot_number}: ${h.status}, phase ${h.current_phase}/7`)
        .join('\n')
    : '  (no lots loaded)';

  const systemPrompt = `${MEDIATION_PROMPT}

SITE CONTEXT:
- Site: ${context.site_name}
- Date: ${context.current_date} | Time: ${context.current_time}
- Sender: ${context.sender_name} (${context.sender_role})
- Active lots:
${houseSummary}

RESPONSE FORMAT:
{
  "event": {
    "event_type": "note|material_request|material_delivery|material_issue|status_change|issue|inspection|alert|worker_arrival|worker_departure|milestone|assignment|calendar|photo|document",
    "title": "Short title for timeline (max 80 chars)",
    "description": "Detailed description"
  },
  "material_request": null | {
    "material_name": "string",
    "quantity": number | null,
    "unit": "string" | null,
    "urgency": "low|medium|high|critical",
    "house_id": "lot number mentioned" | null
  },
  "alert": null | {
    "title": "string",
    "severity": "info|warning|critical",
    "target_role": "supervisor|worker|operator"
  },
  "calendar_event": null | {
    "title": "string",
    "date": "YYYY-MM-DD",
    "event_type": "inspection|delivery|meeting|other"
  },
  "confidence": 0.0-1.0,
  "display_text": "Cleaned/normalized version of the message"
}`;

  return [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: message },
  ];
}

/**
 * Parse the raw AI JSON response into a typed AIMediationResult.
 *
 * Returns null if parsing fails (caller should treat as fallback "note").
 */
export function parseMediationResult(aiResponse: string): ParsedMediationResult | null {
  try {
    const parsed = JSON.parse(aiResponse);

    // Validate required fields
    if (!parsed.event?.event_type || !parsed.event?.title) {
      return null;
    }

    return {
      event: {
        event_type: parsed.event.event_type,
        title: String(parsed.event.title).slice(0, 80),
        description: String(parsed.event.description || ''),
      },
      material_request: parsed.material_request || null,
      alert: parsed.alert || null,
      calendar_event: parsed.calendar_event || null,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      display_text: String(parsed.display_text || parsed.event.description || ''),
    };
  } catch {
    return null;
  }
}

/** Typed result from parseMediationResult (mirrors AIMediationResult from @onsite/timeline) */
export interface ParsedMediationResult {
  event: {
    event_type: string;
    title: string;
    description: string;
  };
  material_request: {
    material_name: string;
    quantity?: number | null;
    unit?: string | null;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    house_id?: string | null;
  } | null;
  alert: {
    title: string;
    severity: 'info' | 'warning' | 'critical';
    target_role: string;
  } | null;
  calendar_event: {
    title: string;
    date: string;
    event_type: string;
  } | null;
  confidence: number;
  display_text: string;
}
