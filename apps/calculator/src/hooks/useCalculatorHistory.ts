// src/hooks/useCalculatorHistory.ts
// Local-only history persistence (Capacitor Preferences on native, localStorage
// on web). Stores entries shaped like the v3 visor consumes them, so playback
// is a 1:1 re-render without re-running the engine.

import { useState, useEffect, useCallback } from 'react';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { logger } from '../lib/logger';
import type { CalculationResult, HistoryEntry } from '../types/calculator';

const HISTORY_KEY = 'calculator_history_v2';  // bump key — old entries won't reload
const MAX_HISTORY_SIZE = 100;

export function useCalculatorHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      let storedHistory: HistoryEntry[] = [];
      if (Capacitor.isNativePlatform()) {
        const { value } = await Preferences.get({ key: HISTORY_KEY });
        if (value) storedHistory = JSON.parse(value);
      } else {
        const value = localStorage.getItem(HISTORY_KEY);
        if (value) storedHistory = JSON.parse(value);
      }
      setHistory(storedHistory);
      logger.history.load(true, storedHistory.length);
    } catch (err) {
      logger.history.error('Error loading history', { error: String(err) });
    } finally {
      setIsLoaded(true);
    }
  };

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

  const addToHistory = useCallback(async (
    result: CalculationResult,
    extras?: { inputMethod?: 'manual' | 'voice'; transcription?: string; voiceLogId?: string },
  ) => {
    if (result.isError) return;  // never store error results
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      expression: result.expression,
      dimension: result.dimension,
      primary: result.primary,
      secondary: result.secondary,
      mixedSystems: result.mixedSystems,
      isApproximate: result.isApproximate,
      exactForm: result.exactForm,
      inputMethod: extras?.inputMethod,
      transcription: extras?.transcription,
      voiceLogId: extras?.voiceLogId,
    };
    setHistory((prev) => {
      const updated = [entry, ...prev].slice(0, MAX_HISTORY_SIZE);
      saveHistory(updated);
      return updated;
    });
  }, []);

  /** In-place edit (Phase 3.5). Replaces the entry's snapshot with a fresh
   *  CalculationResult. Preserves id+timestamp so the card stays put. */
  const updateEntry = useCallback((id: string, result: CalculationResult) => {
    if (result.isError) return;
    setHistory((prev) => {
      const next = prev.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              expression: result.expression,
              dimension: result.dimension,
              primary: result.primary,
              secondary: result.secondary,
              mixedSystems: result.mixedSystems,
              isApproximate: result.isApproximate,
              exactForm: result.exactForm,
              inputMethod: 'manual' as const,
              transcription: undefined,
              voiceLogId: undefined,
            }
          : entry,
      );
      saveHistory(next);
      return next;
    });
  }, []);

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

  return { history, isLoaded, addToHistory, updateEntry, clearHistory };
}
