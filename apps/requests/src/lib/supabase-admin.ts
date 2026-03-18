import { createClient } from "@supabase/supabase-js";

// Server-only: bypasses RLS for test flow (no auth)
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
