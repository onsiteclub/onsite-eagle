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

  const code = url.searchParams.get('code')
  const type = url.searchParams.get('type') as EmailOtpType | null
  const token_hash = url.searchParams.get('token_hash')

  const nextParam =
    url.searchParams.get('next') ??
    (type === 'recovery' ? '/' : '/app')

  const nextPath = nextParam.startsWith('/') ? nextParam : '/app'

  if (!code && (!type || !token_hash)) {
    return NextResponse.redirect(new URL('/?error=missing_token', origin))
  }

  const response = NextResponse.redirect(new URL(nextPath, origin))

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
    const result = await supabase.auth.exchangeCodeForSession(code)
    error = result.error
  } else if (type && token_hash) {
    const result = await supabase.auth.verifyOtp({ type, token_hash })
    error = result.error
  }

  if (error) {
    console.error('Auth callback error:', error.message)
    return NextResponse.redirect(
      new URL(`/?error=auth_callback_error&message=${encodeURIComponent(error.message)}`, origin)
    )
  }

  return response
}
