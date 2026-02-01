import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@onsite/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const redirectTo = searchParams.get('redirect') || '/login';
  
  const supabase = await createClient();
  
  // Sign out the user
  await supabase.auth.signOut();
  
  // Redirect to login or specified URL
  if (redirectTo.startsWith('http')) {
    return NextResponse.redirect(redirectTo);
  }
  
  return NextResponse.redirect(`${origin}${redirectTo}`);
}

export async function POST(request: NextRequest) {
  // Also support POST for form submissions
  return GET(request);
}
