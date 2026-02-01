// src/lib/server-logger.ts
// Sistema de logging para funções serverless (Vercel)
// Logs para console estruturado + Supabase

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Tipos
type LogLevel = 'info' | 'warn' | 'error';
type LogModule = 'API' | 'Voice' | 'Auth' | 'Checkout';

interface ServerLogEntry {
  level?: LogLevel;
  module: LogModule;
  action: string;
  message?: string;
  context?: Record<string, unknown>;
  duration_ms?: number;
  success?: boolean;
  user_id?: string;
  ip?: string;
}

// Supabase client para serverless (usa service role key)
let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient | null {
  if (supabaseAdmin) return supabaseAdmin;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.warn('[ServerLogger] Missing Supabase config - logs will only go to console');
    return null;
  }

  supabaseAdmin = createClient(url, serviceKey);
  return supabaseAdmin;
}

// Função principal de logging para serverless
export async function serverLog(entry: ServerLogEntry): Promise<void> {
  const level = entry.level || (entry.success === false ? 'error' : 'info');
  const prefix = `[${entry.module}]`;
  const msg = entry.message || entry.action;

  // Estrutura JSON para logs do Vercel (melhor para parsing)
  const logData = {
    timestamp: new Date().toISOString(),
    level,
    module: entry.module,
    action: entry.action,
    message: entry.message,
    success: entry.success,
    duration_ms: entry.duration_ms,
    user_id: entry.user_id ? `${entry.user_id.substring(0, 8)}...` : undefined,
    ip: entry.ip ? `${entry.ip.substring(0, 10)}...` : undefined,
    ...entry.context,
  };

  // Console log estruturado
  switch (level) {
    case 'error':
      console.error(prefix, msg, JSON.stringify(logData));
      break;
    case 'warn':
      console.warn(prefix, msg, JSON.stringify(logData));
      break;
    default:
      console.log(prefix, msg, JSON.stringify(logData));
  }

  // Envia para Supabase (apenas erros e eventos importantes)
  if (level === 'error' || entry.success !== undefined) {
    const supabase = getSupabaseAdmin();
    if (!supabase) return;

    try {
      const { error } = await supabase.from('app_logs').insert({
        user_id: entry.user_id || null,
        level,
        module: entry.module,
        action: entry.action,
        message: entry.message || null,
        context: entry.context || {},
        device_info: { platform: 'server', runtime: 'vercel' },
        duration_ms: entry.duration_ms || null,
        success: entry.success ?? null,
      });

      if (error) {
        console.error('[ServerLogger] Failed to insert log:', error.message);
      }
    } catch (err) {
      console.error('[ServerLogger] Exception:', err);
    }
  }
}

// Helper para extrair IP do request
export function getClientIP(headers: Record<string, string | string[] | undefined>): string {
  const forwarded = headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].split(',')[0].trim();
  }
  return 'unknown';
}
