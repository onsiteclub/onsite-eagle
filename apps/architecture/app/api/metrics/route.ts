import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { app_slug, version, status, last_deploy } = body;

    if (!app_slug) {
      return NextResponse.json({ error: 'app_slug required' }, { status: 400 });
    }

    // Use service key for CI updates (passed via header)
    const serviceKey = request.headers.get('x-service-key');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Not configured' }, { status: 503 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (version) updates.version = version;
    if (status) updates.status = status;
    if (last_deploy) updates.last_deploy = last_deploy;

    const { error } = await supabase
      .from('egl_app_registry')
      .update(updates)
      .eq('app_slug', app_slug);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, app_slug, updates });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
