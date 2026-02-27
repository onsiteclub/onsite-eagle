import { NextResponse } from 'next/server';
import { getApps } from '../../../lib/queries';

export async function GET() {
  try {
    const apps = await getApps();
    return NextResponse.json({ source: 'supabase', data: apps });
  } catch {
    return NextResponse.json({ source: 'error', data: [] }, { status: 500 });
  }
}
