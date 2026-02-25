/**
 * @onsite/voice/server — Server-side voice log helpers
 *
 * Persist voice logs, extract ML-valuable entities, detect language.
 * Requires service_role Supabase client (bypasses RLS).
 *
 * Usage:
 *   import { saveVoiceLog, extractEntities, detectLanguage } from '@onsite/voice/server'
 */

import type { VoiceLogRecord, SupabaseClient } from './types';

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

/** Check if user has voice_training consent (server-side, service_role) */
export async function canCollectVoice(
  userId: string,
  supabase: SupabaseClient,
): Promise<boolean> {
  if (!userId) return false;

  try {
    const { data, error } = await supabase
      .from('core_consents')
      .select('granted')
      .eq('user_id', userId)
      .eq('consent_type', 'voice_training')
      .eq('granted', true)
      .limit(1);

    if (error) {
      console.warn('[Voice/Server] Error checking consent:', error.message);
      return false;
    }

    return data && data.length > 0;
  } catch (err) {
    console.error('[Voice/Server] Exception checking consent:', err);
    return false;
  }
}

/** Save a voice log record to core_voice_logs */
export async function saveVoiceLog(
  record: VoiceLogRecord,
  supabase: SupabaseClient,
): Promise<string | null> {
  if (!record.user_id) return null;

  try {
    const { data, error } = await supabase
      .from('core_voice_logs')
      .insert({
        ...record,
        app_name: record.app_name || 'unknown',
        transcription_engine: record.transcription_engine || 'whisper-1',
      })
      .select('id')
      .single();

    if (error) {
      console.warn('[Voice/Server] Error saving voice log:', error.message);
      return null;
    }

    return data?.id || null;
  } catch (err) {
    console.error('[Voice/Server] Exception saving voice log:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Entity Extraction (ML training data)
// ---------------------------------------------------------------------------

/** Extract numbers, units, and operators from a parsed expression */
export function extractEntities(expression: string): Record<string, unknown> {
  const entities: Record<string, unknown> = {
    numbers: [] as string[],
    units: [] as string[],
    operators: [] as string[],
  };

  // Numbers (integers, decimals, fractions)
  const numberMatches = expression.match(/\d+(?:\s+\d+\/\d+|\.\d+|\/\d+)?/g);
  if (numberMatches) {
    (entities.numbers as string[]).push(...numberMatches);
  }

  // Units
  if (expression.includes("'")) (entities.units as string[]).push('feet');
  if (expression.includes('"')) (entities.units as string[]).push('inches');

  // Operators
  const operatorMatches = expression.match(/[+\-*/]/g);
  if (operatorMatches) {
    (entities.operators as string[]).push(...operatorMatches);
  }

  return entities;
}

// ---------------------------------------------------------------------------
// Language Detection
// ---------------------------------------------------------------------------

/** Detect language from transcription (supports PT, EN, ES, FR, PT-mix) */
export function detectLanguage(transcription: string): string {
  const lower = transcription.toLowerCase();

  const ptWords = [
    'mais', 'menos', 'vezes', 'pé', 'pés', 'polegada', 'polegadas',
    'meio', 'quarto', 'oitavo', 'metro', 'metros', 'milímetro', 'centímetro',
  ];
  const esWords = [
    'más', 'menos', 'por', 'pie', 'pies', 'pulgada', 'pulgadas',
    'medio', 'cuarto', 'yarda', 'yardas', 'metro', 'metros',
  ];
  const frWords = [
    'plus', 'moins', 'fois', 'pied', 'pieds', 'pouce', 'pouces',
    'demi', 'quart', 'mètre',
  ];
  const mixedWords = [
    'incha', 'inchas', 'inche', 'fit', 'fiti', 'fits', 'fiz', 'fid',
    'mai', 'meno', 'mili',
  ];

  let ptScore = 0, enScore = 0, esScore = 0, frScore = 0, mixedScore = 0;

  for (const w of ptWords) if (lower.includes(w)) ptScore++;
  for (const w of esWords) if (lower.includes(w)) esScore++;
  for (const w of frWords) if (lower.includes(w)) frScore++;
  for (const w of mixedWords) if (lower.includes(w)) mixedScore++;

  if (lower.includes('feet') || lower.includes('inch') || lower.includes('half')) {
    enScore += 2;
  }

  // Portunhol (PT-EN mix, common in Brazilian construction workers)
  if (mixedScore > 0) return 'pt-mix';

  const max = Math.max(ptScore, enScore, esScore, frScore);
  if (max === 0) return 'en';
  if (ptScore === max) return 'pt';
  if (esScore === max) return 'es';
  if (frScore === max) return 'fr';
  return 'en';
}

/** Detect informal/slang terms in transcription (training data gold) */
export function detectInformalTerms(transcription: string): string[] {
  const informal: string[] = [];
  const lowerText = transcription.toLowerCase();

  const ptTerms = [
    'e meio', 'e um quarto', 'e três quartos',
    'metade', 'dobro', 'triplo',
    'um pouquinho', 'mais ou menos',
    'dois dedos', 'um palmo',
  ];

  const enTerms = [
    'and a half', 'and a quarter', 'three quarters',
    'half of', 'double', 'triple',
    'a bit', 'about', 'roughly',
    'a couple inches', 'a hair',
  ];

  // Portunhol / PT-EN mix (Brazilians in Canadian construction)
  const mixedTerms = [
    'incha', 'inchas', 'inche', 'insh', 'inchs',
    'fit', 'fiti', 'fits', 'fiz', 'fid', 'fe',
    'mai', 'mái', 'meno', 'menu', 'vei', 'véi',
    'um e mei', 'dois e mei', 'três e mei', 'quatro e mei',
    'meia incha', 'meia polegada',
    'mili', 'mill', 'centi',
    'pulgada', 'pulgadas', 'pulg',
    'pie', 'pies', 'piez',
    'yarda', 'yardas',
    'iard', 'jard', 'yerd',
    'haf', 'haff', 'qtr', 'cora', 'core',
    'eit', 'ate', 'octavo', 'octavos',
    'by', 'bai', 'ponto', 'punto',
  ];

  for (const term of [...ptTerms, ...enTerms, ...mixedTerms]) {
    if (lowerText.includes(term)) {
      informal.push(term);
    }
  }

  return informal;
}
