// app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

type EmailOtpType =
  | 'recovery'
  | 'email'
  | 'signup'
  | 'invite'
  | 'magiclink'
  | 'email_change'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const origin = url.origin

  // PKCE flow uses 'code', token flow uses 'token_hash' + 'type'
  const code = url.searchParams.get('code')
  const type = url.searchParams.get('type') as EmailOtpType | null
  const token_hash = url.searchParams.get('token_hash')

  // Optional: allow caller to specify next. Default for recovery is /reset-password
  const nextParam =
    url.searchParams.get('next') ??
    (type === 'recovery' ? '/reset-password' : '/')

  // Anti open-redirect: only allow internal paths
  const nextPath = nextParam.startsWith('/') ? nextParam : '/'

  // Need at least one auth method
  if (!code && (!type || !token_hash)) {
    return NextResponse.redirect(new URL('/?error=missing_token', origin))
  }

  // Create the redirect response first so we can attach cookies to it
  const response = NextResponse.redirect(new URL(nextPath, origin))

  // Type the cookie payload to satisfy TS (noImplicitAny)
  type CookieToSet = {
    name: string
    value: string
    options?: Parameters<NextResponse['cookies']['set']>[2]
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  let error: Error | null = null

  if (code) {
    // PKCE flow: exchange authorization code for session
    const result = await supabase.auth.exchangeCodeForSession(code)
    error = result.error
  } else if (type && token_hash) {
    // Token flow: verify OTP token
    const result = await supabase.auth.verifyOtp({ type, token_hash })
    error = result.error
  }

  if (error) {
    console.error('Auth callback error:', {
      message: error.message,
      type,
      hasCode: Boolean(code),
      hasTokenHash: Boolean(token_hash),
      nextPath,
    })

    return NextResponse.redirect(
      new URL(
        `/?error=auth_callback_error&message=${encodeURIComponent(error.message)}`,
        origin
      )
    )
  }

  return response
}
