// src/hooks/useCalculatorHistory.ts
// Hook para gerenciar histórico de cálculos com persistência

import { useState, useEffect, useCallback } from 'react';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { logger } from '../lib/logger';
import type { CalculationResult, HistoryEntry } from '../types/calculator';

const HISTORY_KEY = 'calculator_history';
// Phase 3.4: expanded persistence to 100 turns. 100 cards render fine without
// virtualization on modern devices; if scroll perf becomes a problem on low-end
// Android, add react-window here.
const MAX_HISTORY_SIZE = 100;

export function useCalculatorHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Carrega histórico do storage ao montar
  useEffect(() => {
    loadHistory();
  }, []);

  // Carrega histórico do Preferences ou localStorage
  const loadHistory = async () => {
    try {
      let storedHistory: HistoryEntry[] = [];

      if (Capacitor.isNativePlatform()) {
        const { value } = await Preferences.get({ key: HISTORY_KEY });
        if (value) {
          storedHistory = JSON.parse(value);
        }
      } else {
        const value = localStorage.getItem(HISTORY_KEY);
        if (value) {
          storedHistory = JSON.parse(value);
        }
      }

      setHistory(storedHistory);
      logger.history.load(true, storedHistory.length);
    } catch (err) {
      logger.history.error('Error loading history', { error: String(err) });
    } finally {
      setIsLoaded(true);
    }
  };

  // Salva histórico no storage
  const saveHistory = async (newHistory: HistoryEntry[]) => {
    try {
      const value = JSON.stringify(newHistory);

      if (Capacitor.isNativePlatform()) {
        await Preferences.set({ key: HISTORY_KEY, value });
      } else {
        localStorage.setItem(HISTORY_KEY, value);
      }
      logger.history.save(true, { count: newHistory.length });
    } catch (err) {
      logger.history.error('Error saving history', { error: String(err) });
    }
  };

  // Adds an entry, capped at MAX_HISTORY_SIZE. Extras (inputMethod/transcription/voiceLogId)
  // are optional — older callers still pass just the result.
  const addToHistory = useCallback(async (
    result: CalculationResult,
    extras?: { inputMethod?: 'manual' | 'voice'; transcription?: string; voiceLogId?: string }
  ) => {
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      expression: result.expression,
      resultFeetInches: result.resultFeetInches,
      resultTotalInches: result.resultTotalInches,
      resultDecimal: result.resultDecimal,
      isInchMode: result.isInchMode,
      timestamp: Date.now(),
      inputMethod: extras?.inputMethod,
      transcription: extras?.transcription,
      voiceLogId: extras?.voiceLogId,
      // Phase 1 — carry engine's dim output so the card doesn't need to re-infer.
      dimension: result.dimension,
      unitCanonical: result.unitCanonical,
      displayPrimary: result.displayPrimary,
      displaySecondary: result.displaySecondary,
    };

    setHistory((prev) => {
      const updated = [entry, ...prev].slice(0, MAX_HISTORY_SIZE);
      saveHistory(updated);
      return updated;
    });
  }, []);

  // Phase 3.5 — replace an entry's expression+result in place (inline edit).
  // Preserves timestamp + id so the card stays where it is; only the math changes.
  const updateEntry = useCallback((id: string, result: CalculationResult) => {
    setHistory((prev) => {
      const next = prev.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              expression: result.expression,
              resultFeetInches: result.resultFeetInches,
              resultTotalInches: result.resultTotalInches,
              resultDecimal: result.resultDecimal,
              isInchMode: result.isInchMode,
              // Edits are implicitly manual — even if the original was voice.
              inputMethod: 'manual' as const,
              // Don't preserve transcription/voice_log_id: they no longer describe the result.
              transcription: undefined,
              voiceLogId: undefined,
              // Keep dim output in sync after recompute.
              dimension: result.dimension,
              unitCanonical: result.unitCanonical,
              displayPrimary: result.displayPrimary,
              displaySecondary: result.displaySecondary,
            }
          : entry
      );
      saveHistory(next);
      return next;
    });
  }, []);

  // Limpa todo o histórico
  const clearHistory = useCallback(async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await Preferences.remove({ key: HISTORY_KEY });
      } else {
        localStorage.removeItem(HISTORY_KEY);
      }
      setHistory([]);
      logger.history.clear(true);
    } catch (err) {
      logger.history.error('Error clearing history', { error: String(err) });
    }
  }, []);

  return {
    history,
    isLoaded,
    addToHistory,
    updateEntry,
    clearHistory,
  };
}
