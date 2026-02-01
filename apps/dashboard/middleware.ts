import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Protected routes - require authentication
  if (pathname.startsWith('/account') || pathname.startsWith('/admin')) {
    if (!user) {
      // Redirect to / (login page)
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Admin - requires admin role
  if (pathname.startsWith('/admin')) {
    // Check admin_users table for admin role
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('is_active, role')
      .eq('user_id', user!.id)
      .single()

    if (!adminUser?.is_active) {
      return NextResponse.redirect(new URL('/account', request.url))
    }
  }

  // Update last_active_at in core_profiles
  if (user && (pathname.startsWith('/account') || pathname.startsWith('/admin'))) {
    await supabase
      .from('core_profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', user.id)
  }

  return response
}

export const config = {
  matcher: [
    '/account/:path*',
    '/admin/:path*',
  ],
}
