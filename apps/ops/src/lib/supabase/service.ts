import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// ⚠️ Service role bypassa RLS. Usar APENAS em endpoints server-side
// que precisam ignorar o filtro por operator (ex: /api/inbox webhook).
// NUNCA importar em Client Components.
export function createServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
