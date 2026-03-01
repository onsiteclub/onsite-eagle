import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { WEEKLY_REPORT_PROMPT, EAGLE_PROMPT_VERSION } from '@onsite/ai/specialists/eagle';

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
 * POST /api/reports/weekly
 *
 * Generates an AI-powered weekly progress report for a site.
 *
 * Body: { jobsite_id: string }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { jobsite_id } = await request.json();

    if (!jobsite_id) {
      return NextResponse.json(
        { error: 'Missing required field: jobsite_id' },
        { status: 400 },
      );
    }

    // Fetch site info
    const { data: site } = await supabase
      .from('frm_jobsites')
      .select('name, total_lots, completed_lots')
      .eq('id', jobsite_id)
      .single();

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Fetch all houses with status
    const { data: houses } = await supabase
      .from('frm_lots')
      .select('id, lot_number, status, current_phase, progress_percentage')
      .eq('jobsite_id', jobsite_id)
      .is('deleted_at', null);

    // Fetch schedules for deviation info
    const { data: schedules } = await supabase
      .from('frm_schedules')
      .select('lot_id, status, deviation_days, assigned_worker_name')
      .eq('jobsite_id', jobsite_id);

    // Fetch recent external events (weather, etc.) from last 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { data: events } = await supabase
      .from('frm_external_events')
      .select('event_type, title, impact_severity, estimated_delay_days')
      .eq('jobsite_id', jobsite_id)
      .gte('event_date', weekAgo);

    // Fetch recent timeline messages (last 7 days) for context
    const { data: recentMessages } = await supabase
      .from('frm_messages')
      .select('content, sender_type, sender_name, ai_interpretation, created_at')
      .eq('jobsite_id', jobsite_id)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(30);

    // Build context for AI
    const siteContext = {
      site_name: site.name,
      total_lots: site.total_lots || (houses?.length || 0),
      completed_lots: site.completed_lots || 0,
      houses: (houses || []).map((h: { lot_number: string; status: string; current_phase: number; progress_percentage: number }) => ({
        lot_number: h.lot_number,
        status: h.status,
        phase: h.current_phase,
        progress: h.progress_percentage,
      })),
      schedules: (schedules || []).map((s: { lot_id: string; status: string; deviation_days: number | null; assigned_worker_name: string | null }) => ({
        lot_id: s.lot_id,
        status: s.status,
        deviation_days: s.deviation_days,
        worker: s.assigned_worker_name,
      })),
      external_events: (events || []).map((e: { event_type: string; title: string; impact_severity: string; estimated_delay_days: number | null }) => ({
        type: e.event_type,
        title: e.title,
        severity: e.impact_severity,
        delay_days: e.estimated_delay_days,
      })),
      recent_activity: (recentMessages || []).slice(0, 15).map((m: { content: string; sender_type: string; sender_name: string; created_at: string }) => ({
        message: m.content.slice(0, 200),
        from: m.sender_name,
        role: m.sender_type,
        date: m.created_at,
      })),
      report_date: new Date().toISOString().split('T')[0],
    };

    // Call OpenAI
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 2000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: WEEKLY_REPORT_PROMPT },
        { role: 'user', content: JSON.stringify(siteContext) },
      ],
    });

    const reportContent = response.choices[0]?.message?.content || '{}';
    let report: Record<string, unknown>;
    try {
      report = JSON.parse(reportContent);
    } catch {
      report = { executive_summary: 'Report generation failed', sections: [], metrics: {}, alerts: [] };
    }

    // Save to int_ai_reports
    await supabase.from('int_ai_reports').insert({
      jobsite_id,
      report_type: 'weekly_summary',
      period_start: weekAgo,
      period_end: new Date().toISOString().split('T')[0],
      title: `Weekly Report - ${site.name}`,
      executive_summary: (report.executive_summary as string) || '',
      sections: report.sections || [],
      metrics: report.metrics || {},
      alerts: report.alerts || [],
      ai_model: 'gpt-4o-mini',
      ai_confidence: 0.85,
      generation_time_ms: Date.now() - startTime,
      status: 'draft',
    });

    return NextResponse.json({
      success: true,
      report: {
        ...report,
        prompt_version: EAGLE_PROMPT_VERSION,
        generated_at: new Date().toISOString(),
      },
      processing_time_ms: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Weekly report generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Report generation failed' },
      { status: 500 },
    );
  }
}
