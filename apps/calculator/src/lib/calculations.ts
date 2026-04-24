// src/lib/calculations.ts
// Persists successful calculations to ccl_calculations. No-op for anon users
// or when Supabase is not configured. Schema unchanged — we map the v3 result
// shape to the existing `result_*` columns.

import { supabase, isSupabaseEnabled } from './supabase';
import { logger } from '@onsite/logger';
import type { CalculationResult } from '../types/calculator';

type CalcType = 'length' | 'area' | 'volume' | 'material' | 'conversion' | 'custom';
export type InputMethod = 'keypad' | 'voice' | 'camera';

interface CalculationRecord {
  id?: string;
  user_id?: string;
  calc_type: CalcType;
  calc_subtype?: string;
  input_expression: string;
  input_values?: Record<string, unknown>;
  result_value?: number;
  result_unit?: string;
  result_formatted?: string;
  input_method: InputMethod;
  voice_log_id?: string;
  template_id?: string;
  trade_context?: string;
  was_successful: boolean;
  was_saved?: boolean;
  was_shared?: boolean;
  device_id?: string;
  app_version?: string;
  created_at?: string;
}

function detectCalcType(result: CalculationResult): CalcType {
  switch (result.dimension) {
    case 'length': return 'length';
    case 'area':   return 'area';
    case 'volume': return 'volume';
    default:       return 'custom';
  }
}

function detectCalcSubtype(result: CalculationResult): string {
  if (result.dimension === 'length') {
    if (result.mixedSystems) return 'mixed_systems';
    return result.primary.unitLabel ?? 'length';
  }
  if (result.dimension === 'area') return 'area';
  if (result.dimension === 'volume') return 'volume';
  return 'decimal';
}

/** Persist a successful calculation. Skips silently for anon / supabase-off. */
export async function saveCalculation(
  result: CalculationResult,
  options: {
    userId?: string;
    inputMethod?: InputMethod;
    voiceLogId?: string;
    tradeContext?: string;
    appVersion?: string;
  } = {},
): Promise<string | null> {
  if (result.isError) return null;
  if (!isSupabaseEnabled() || !supabase) {
    logger.debug('DB', 'Supabase not enabled, skipping save');
    return null;
  }
  if (!options.userId) {
    logger.debug('DB', 'No userId provided, skipping save');
    return null;
  }

  // Best-effort numeric back-out for the legacy `result_value` column.
  // Strip locale separators + non-numeric glyphs before parseFloat.
  const numericRaw = result.primary.value
    .replace(/[. ]/g, '')   // PT thousand separators
    .replace(/,/g, '.')           // PT decimal comma
    .replace(/[^\d.\-−]/g, '')
    .replace(/−/g, '-');
  const numericValue = parseFloat(numericRaw);

  try {
    const record: CalculationRecord = {
      user_id: options.userId,
      calc_type: detectCalcType(result),
      calc_subtype: detectCalcSubtype(result),
      input_expression: result.expression,
      result_value: isFinite(numericValue) ? numericValue : undefined,
      result_unit: result.primary.unitLabel ?? (result.dimension === 'length' ? 'inches' : 'decimal'),
      result_formatted: result.primary.value,
      input_method: options.inputMethod || 'keypad',
      voice_log_id: options.voiceLogId,
      trade_context: options.tradeContext,
      was_successful: true,
      app_version: options.appVersion,
    };

    const { data, error } = await supabase
      .from('ccl_calculations')
      .insert(record)
      .select('id')
      .single();

    if (error) {
      console.error('[Calculations] Error saving:', error.message, error);
      return null;
    }
    logger.debug('DB', 'Calculation saved', { id: data?.id });
    return data?.id || null;
  } catch (err) {
    console.error('[Calculations] Exception saving:', err);
    return null;
  }
}
