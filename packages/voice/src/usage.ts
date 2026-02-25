/**
 * @onsite/voice/usage — Free-tier voice usage tracking
 *
 * Tracks how many times voice has been used before requiring login/subscription.
 * Uses localStorage (web) or a provided storage adapter (native).
 *
 * Usage:
 *   import { useVoiceUsage } from '@onsite/voice/usage'
 *
 *   const { remainingUses, hasReachedLimit, incrementUsage } = useVoiceUsage()
 */

import { useState, useEffect, useCallback } from 'react';
import type { VoiceUsageReturn } from './types';

const STORAGE_KEY = 'voice_usage_count';

/** Default max free uses before login/subscription required */
export const MAX_FREE_USES = 50;

/** Storage adapter interface for cross-platform support */
export interface VoiceUsageStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

/** Default: localStorage adapter */
const localStorageAdapter: VoiceUsageStorage = {
  async get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore (SSR, private browsing)
    }
  },
};

/**
 * Hook to track free-tier voice usage.
 *
 * @param storage — Optional storage adapter (default: localStorage).
 *   For Capacitor apps, pass a Preferences adapter.
 *   For Expo apps, pass an AsyncStorage adapter.
 * @param maxUses — Max free uses (default: 50)
 */
export function useVoiceUsage(
  storage: VoiceUsageStorage = localStorageAdapter,
  maxUses: number = MAX_FREE_USES,
): VoiceUsageReturn {
  const [usageCount, setUsageCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const value = await storage.get(STORAGE_KEY);
        if (value) setUsageCount(parseInt(value, 10) || 0);
      } catch {
        // ignore
      } finally {
        setLoaded(true);
      }
    };
    load();
  }, [storage]);

  const saveUsage = useCallback(
    async (count: number) => {
      try {
        await storage.set(STORAGE_KEY, count.toString());
      } catch {
        // ignore
      }
    },
    [storage],
  );

  const incrementUsage = useCallback(async () => {
    setUsageCount((prev) => {
      const next = prev + 1;
      saveUsage(next);
      return next;
    });
  }, [saveUsage]);

  const resetUsage = useCallback(async () => {
    setUsageCount(0);
    await saveUsage(0);
  }, [saveUsage]);

  return {
    usageCount,
    remainingUses: Math.max(0, maxUses - usageCount),
    hasReachedLimit: loaded && usageCount >= maxUses,
    incrementUsage,
    resetUsage,
  };
}
