// api/lib/rate-limit.ts
// Rate limiting persistente via Supabase (funciona entre cold starts serverless)

const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX_REQUESTS = 30;

export { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS };

/**
 * Verifica rate limit consultando app_logs no Supabase.
 * Conta requests recentes do mesmo IP dentro da janela de tempo.
 * Fail-open: se Supabase nao esta disponivel, permite o request.
 */
export async function checkRateLimit(ip: string): Promise<boolean> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return true; // fail open se nao configurado

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count, error } = await supabase
      .from('app_logs')
      .select('*', { count: 'exact', head: true })
      .eq('module', 'Voice')
      .eq('action', 'api_request')
      .eq('ip', ip)
      .gte('created_at', windowStart);

    if (error) {
      console.warn('[RateLimit] Query error, allowing request:', error.message);
      return true;
    }

    return (count || 0) < RATE_LIMIT_MAX_REQUESTS;
  } catch (err) {
    console.warn('[RateLimit] Exception, allowing request:', err);
    return true; // fail open
  }
}
