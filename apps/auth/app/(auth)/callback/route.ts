import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@onsite/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  
  const code = searchParams.get('code');
  const next = searchParams.get('next') || searchParams.get('redirect') || '/';
  
  if (code) {
    const supabase = await createClient();
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.session) {
      // Successfully exchanged code for session
      
      // Check if this is a mobile deep link
      if (next.startsWith('onsiteclub://') || 
          next.startsWith('onsitecalculator://') || 
          next.startsWith('onsitetimekeeper://')) {
        // Redirect to mobile app with tokens
        const separator = next.includes('?') ? '&' : '?';
        const redirectUrl = `${next}${separator}access_token=${encodeURIComponent(data.session.access_token)}&refresh_token=${encodeURIComponent(data.session.refresh_token)}`;
        return NextResponse.redirect(redirectUrl);
      }
      
      // Web redirect - just go to the URL (cookies are set)
      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Something went wrong, redirect to error page or login
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
