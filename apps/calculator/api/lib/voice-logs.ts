// api/lib/voice-logs.ts
// Persistência de voice_logs no Supabase (server-side)
// Schema definido por Blueprint (Blue)
// IMPORTANTE: Só salvar se usuário tiver consentimento voice_training

import { createClient } from '@supabase/supabase-js';

// Supabase com service role (server-side)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

export interface VoiceLogRecord {
  id?: string;
  user_id?: string;
  app_name?: string;
  feature_context?: string;
  session_id?: string;
  audio_duration_ms?: number;
  audio_format?: string;
  transcription_raw?: string;
  transcription_normalized?: string;
  transcription_engine?: string;
  language_detected?: string;
  intent_detected?: string;
  intent_fulfilled?: boolean;
  entities?: Record<string, unknown>;
  informal_terms?: string[];
  was_successful: boolean;
  error_type?: string;
  error_message?: string;
  device_model?: string;
  os?: string;
  app_version?: string;
  client_timestamp?: string;
}

/**
 * Verifica se usuário tem consentimento para coleta de voz
 * Conforme definido no [LOCKED] VERIFICAÇÃO DE CONSENTIMENTO
 */
export async function canCollectVoice(userId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  console.log('[VoiceLogs] canCollectVoice - supabase client:', !!supabase, 'userId:', userId);
  console.log('[VoiceLogs] ENV check - SUPABASE_URL:', !!process.env.SUPABASE_URL, 'SERVICE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!supabase || !userId) {
    console.log('[VoiceLogs] canCollectVoice returning false - no supabase or no userId');
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('core_consents')
      .select('granted')
      .eq('user_id', userId)
      .eq('consent_type', 'voice_training')
      .eq('granted', true)
      .limit(1);

    console.log('[VoiceLogs] core_consents query result:', { data, error: error?.message });

    if (error) {
      console.warn('[VoiceLogs] Error checking consent:', error.message);
      return false;
    }

    const hasConsent = data && data.length > 0;
    console.log('[VoiceLogs] Final hasConsent:', hasConsent);
    return hasConsent;
  } catch (err) {
    console.error('[VoiceLogs] Exception checking consent:', err);
    return false;
  }
}

/**
 * Salva um voice_log no banco de dados
 * SOMENTE chama se canCollectVoice() retornar true
 */
export async function saveVoiceLog(record: VoiceLogRecord): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return null;
  }

  // Não salvar sem user_id (modo anônimo)
  if (!record.user_id) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('core_voice_logs')
      .insert({
        ...record,
        app_name: record.app_name || 'calculator',
        transcription_engine: record.transcription_engine || 'whisper-1',
      })
      .select('id')
      .single();

    if (error) {
      console.warn('[VoiceLogs] Error saving:', error.message);
      return null;
    }

    return data?.id || null;
  } catch (err) {
    console.error('[VoiceLogs] Exception saving:', err);
    return null;
  }
}

/**
 * Extrai entidades de uma expressão parseada
 * Campos de OURO para ML
 */
export function extractEntities(expression: string): Record<string, unknown> {
  const entities: Record<string, unknown> = {
    numbers: [] as string[],
    units: [] as string[],
    operators: [] as string[],
  };

  // Extrair números (inteiros, decimais, frações)
  const numberMatches = expression.match(/\d+(?:\s+\d+\/\d+|\.\d+|\/\d+)?/g);
  if (numberMatches) {
    (entities.numbers as string[]).push(...numberMatches);
  }

  // Extrair unidades
  if (expression.includes("'")) {
    (entities.units as string[]).push('feet');
  }
  if (expression.includes('"')) {
    (entities.units as string[]).push('inches');
  }

  // Extrair operadores
  const operatorMatches = expression.match(/[+\-*/]/g);
  if (operatorMatches) {
    (entities.operators as string[]).push(...operatorMatches);
  }

  return entities;
}

/**
 * Detecta termos informais na transcrição
 * OURO MÁXIMO para treinamento de modelo
 */
export function detectInformalTerms(transcription: string): string[] {
  const informal: string[] = [];
  const lowerText = transcription.toLowerCase();

  // Termos informais em português
  const ptTerms = [
    'e meio', 'e um quarto', 'e três quartos',
    'metade', 'dobro', 'triplo',
    'um pouquinho', 'mais ou menos',
    'dois dedos', 'um palmo',
  ];

  // Termos informais em inglês
  const enTerms = [
    'and a half', 'and a quarter', 'three quarters',
    'half of', 'double', 'triple',
    'a bit', 'about', 'roughly',
    'a couple inches', 'a hair',
  ];

  // Portunhol / Mistura PT-EN (brasileiros na construção)
  const mixedTerms = [
    // Inches variations
    'incha', 'inchas', 'inche', 'insh', 'inchs',
    // Feet variations
    'fit', 'fiti', 'fits', 'fiz', 'fid', 'fe',
    // Operators (fala rápida)
    'mai', 'mái',                          // mais
    'meno', 'menu',                        // menos
    'vei', 'véi',                          // vezes
    // Meio truncado
    'um e mei', 'dois e mei', 'três e mei', 'quatro e mei',
    'meia incha', 'meia polegada',
    // Metric informal
    'mili', 'mill', 'centi',
    // Spanish variations
    'pulgada', 'pulgadas', 'pulg',
    'pie', 'pies', 'piez',
    'yarda', 'yardas',
    // Noise/unclear speech
    'iard', 'jard', 'yerd',
    // Fraction variations (unclear speech)
    'haf', 'haff',                         // half
    'qtr', 'cora', 'core',                 // quarter
    'eit', 'ate',                          // eighth
    'octavo', 'octavos',                   // Spanish eighth
    // Dimension separator
    'by', 'bai',                           // "two by four"
    // Decimal
    'ponto', 'punto',                      // point
  ];

  for (const term of [...ptTerms, ...enTerms, ...mixedTerms]) {
    if (lowerText.includes(term)) {
      informal.push(term);
    }
  }

  return informal;
}

/**
 * Detecta idioma da transcrição (simplificado)
 * Suporta detecção de mistura PT-EN (portunhol)
 */
export function detectLanguage(transcription: string): string {
  const lower = transcription.toLowerCase();

  // Palavras características de cada idioma
  const ptWords = ['mais', 'menos', 'vezes', 'pé', 'pés', 'polegada', 'polegadas', 'meio', 'quarto', 'oitavo', 'metro', 'metros', 'milímetro', 'centímetro'];
  const esWords = ['más', 'menos', 'por', 'pie', 'pies', 'pulgada', 'pulgadas', 'medio', 'cuarto', 'yarda', 'yardas', 'metro', 'metros'];
  const frWords = ['plus', 'moins', 'fois', 'pied', 'pieds', 'pouce', 'pouces', 'demi', 'quart', 'mètre'];

  // Termos de portunhol (mistura PT-EN comum em brasileiros)
  const mixedWords = ['incha', 'inchas', 'inche', 'fit', 'fiti', 'fits', 'fiz', 'fid', 'mai', 'meno', 'mili'];

  let ptScore = 0, enScore = 0, esScore = 0, frScore = 0, mixedScore = 0;

  for (const w of ptWords) if (lower.includes(w)) ptScore++;
  for (const w of esWords) if (lower.includes(w)) esScore++;
  for (const w of frWords) if (lower.includes(w)) frScore++;
  for (const w of mixedWords) if (lower.includes(w)) mixedScore++;

  // Inglês é fallback (palavras como 'feet', 'inch', 'half' são comuns)
  if (lower.includes('feet') || lower.includes('inch') || lower.includes('half')) {
    enScore += 2;
  }

  // Se detectou termos de mistura, retorna 'pt-mix' (português misturado)
  if (mixedScore > 0) {
    return 'pt-mix';
  }

  const max = Math.max(ptScore, enScore, esScore, frScore);
  if (max === 0) return 'en'; // default
  if (ptScore === max) return 'pt';
  if (esScore === max) return 'es';
  if (frScore === max) return 'fr';
  return 'en';
}
