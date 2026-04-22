import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // Todas as rotas exceto assets estáticos, _next e webhook público /api/inbox
    '/((?!_next/static|_next/image|favicon.ico|api/inbox|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
