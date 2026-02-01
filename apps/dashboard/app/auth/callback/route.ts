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

  const type = url.searchParams.get('type') as EmailOtpType | null

  // Prefer the correct param name (token_hash). Keep fallback to legacy "code" just in case.
  const token_hash =
    url.searchParams.get('token_hash') ??
    url.searchParams.get('code')

  // Optional: allow caller to specify next. Default for recovery is /reset-password
  const nextParam =
    url.searchParams.get('next') ??
    (type === 'recovery' ? '/reset-password' : '/')

  // Anti open-redirect: only allow internal paths
  const nextPath = nextParam.startsWith('/') ? nextParam : '/reset-password'

  if (!type || !token_hash) {
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

  const { error } = await supabase.auth.verifyOtp({ type, token_hash })

  if (error) {
    console.error('Auth callback error:', {
      message: error.message,
      type,
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
