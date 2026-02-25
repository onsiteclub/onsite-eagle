import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import {
  buildMediationPrompt,
  parseMediationResult,
  MEDIATION_PROMPT_VERSION,
} from '@onsite/ai/specialists/mediator';
import type { MediationContext } from '@onsite/ai/specialists/mediator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return new OpenAI({ apiKey });
}

/**
 * POST /api/timeline/mediate
 *
 * Interprets a raw text message using AI and returns a typed timeline event.
 * Optionally updates the egl_messages row with ai_interpretation.
 *
 * Body: {
 *   message_id?: string   — if provided, updates the row after mediation
 *   message: string       — raw text to interpret
 *   site_id: string
 *   house_id?: string
 *   sender_type: string
 *   sender_id?: string
 *   sender_name: string
 *   source_app: string
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const {
      message_id,
      message,
      site_id,
      house_id,
      sender_type,
      sender_name,
    } = body;

    if (!message || !site_id) {
      return NextResponse.json(
        { error: 'Missing required fields: message, site_id' },
        { status: 400 },
      );
    }

    // Fetch site context
    const { data: site } = await supabase
      .from('egl_sites')
      .select('name')
      .eq('id', site_id)
      .single();

    // Fetch active houses for context
    const { data: houses } = await supabase
      .from('egl_houses')
      .select('lot_number, status, current_phase')
      .eq('site_id', site_id)
      .is('deleted_at', null)
      .order('lot_number', { ascending: true })
      .limit(30);

    const now = new Date();

    const context: MediationContext = {
      site_name: site?.name || 'Unknown Site',
      houses: (houses || []).map((h: { lot_number: string; status: string; current_phase: number }) => ({
        lot_number: h.lot_number,
        status: h.status || 'unknown',
        current_phase: h.current_phase || 1,
      })),
      sender_role: sender_type || 'worker',
      sender_name: sender_name || 'Unknown',
      current_date: now.toISOString().split('T')[0],
      current_time: now.toLocaleTimeString('en-CA', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
    };

    // Build prompt and call OpenAI
    const messages = buildMediationPrompt(message, context);
    const openai = getOpenAIClient();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1000,
      response_format: { type: 'json_object' },
      messages,
    });

    const textContent = response.choices[0]?.message?.content || '{}';
    const result = parseMediationResult(textContent);

    if (!result) {
      // AI returned unparseable response — use fallback
      const fallback = {
        event: { event_type: 'note', title: 'Message', description: message },
        material_request: null,
        alert: null,
        calendar_event: null,
        confidence: 0,
        display_text: message,
      };

      if (message_id) {
        await supabase
          .from('egl_messages')
          .update({
            ai_interpretation: {
              ...fallback,
              prompt_version: MEDIATION_PROMPT_VERSION,
              mediated_at: new Date().toISOString(),
              fallback: true,
            },
          })
          .eq('id', message_id);
      }

      return NextResponse.json({
        success: true,
        result: fallback,
        fallback: true,
        processing_time_ms: Date.now() - startTime,
      });
    }

    // Update the message row with AI interpretation
    if (message_id) {
      await supabase
        .from('egl_messages')
        .update({
          ai_interpretation: {
            ...result,
            prompt_version: MEDIATION_PROMPT_VERSION,
            mediated_at: new Date().toISOString(),
          },
        })
        .eq('id', message_id);
    }

    // If a material_request was detected, create an egl_material_requests row
    if (result.material_request && result.event.event_type === 'material_request') {
      const mr = result.material_request;

      // Try to resolve house_id from lot number
      let resolvedHouseId = house_id || null;
      if (mr.house_id && !resolvedHouseId) {
        const { data: house } = await supabase
          .from('egl_houses')
          .select('id')
          .eq('site_id', site_id)
          .eq('lot_number', mr.house_id)
          .maybeSingle();
        if (house) resolvedHouseId = house.id;
      }

      await supabase.from('egl_material_requests').insert({
        site_id,
        house_id: resolvedHouseId,
        material_name: mr.material_name,
        quantity: mr.quantity || 1,
        unit: mr.unit || 'units',
        urgency_level: mr.urgency || 'medium',
        status: 'pending',
        requested_by_name: sender_name || 'Unknown',
        notes: `AI-detected from message: "${message}"`,
      });
    }

    // Trigger push notifications for event types that warrant them (fire-and-forget)
    if (result.confidence >= 0.6 && result.event.event_type !== 'note') {
      triggerPushNotification({
        event_type: result.event.event_type,
        site_id,
        house_id: house_id || undefined,
        title: result.event.title || result.display_text,
        body: result.event.description || result.display_text,
        sender_id: body.sender_id,
        data: message_id ? { message_id } : undefined,
      }).catch((err) =>
        console.error('[mediate] Push notification failed (non-fatal):', err),
      );
    }

    return NextResponse.json({
      success: true,
      result,
      processing_time_ms: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Timeline mediation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Mediation failed' },
      { status: 500 },
    );
  }
}

/**
 * Fire-and-forget push notification via the internal push/send API route.
 * Uses the same host (Monitor) so we call via absolute URL built from headers.
 */
async function triggerPushNotification(payload: {
  event_type: string;
  site_id: string;
  house_id?: string;
  title: string;
  body: string;
  sender_id?: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  await fetch(`${baseUrl}/api/push/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
