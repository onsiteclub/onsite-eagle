import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

const AUTH_PATHS = ['/login', '/signup']
const PUBLIC_PATHS = ['/auth/callback']

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Importante: getUser() refresca a sessão. Não remover.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // /auth/callback — passa sem guardas (processa PKCE exchange)
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return supabaseResponse
  }

  // /login, /signup — apenas para deslogados
  if (AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    if (user) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return supabaseResponse
  }

  // Tudo mais (dashboard + /onboarding) requer login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Verifica se user tem registro em ops_operators
  const { data: operator } = await supabase
    .from('ops_operators')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  const isOnboarding = pathname.startsWith('/onboarding')

  if (!operator && !isOnboarding) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  if (operator && isOnboarding) {
    // A página /onboarding decide internamente se ainda precisa dos passos 2/3
    // ou redireciona para /inbox. Deixamos passar.
    return supabaseResponse
  }

  return supabaseResponse
}
