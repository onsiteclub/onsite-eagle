/**
 * @onsite/offline — React Native hook for offline sync.
 *
 * Listens to NetInfo connectivity changes and auto-flushes
 * the offline queue when the device comes back online.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { flush, getQueueSize } from './queue';
import type { FlushResult } from './queue';

/** NetInfo subscription interface (to avoid hard dependency) */
interface NetInfoSubscription {
  (): void;
}

interface NetInfoState {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}

type NetInfoModule = {
  addEventListener: (listener: (state: NetInfoState) => void) => NetInfoSubscription;
  fetch: () => Promise<NetInfoState>;
};

export interface UseOfflineSyncOptions {
  /** Supabase client for flushing queued writes */
  supabase: Parameters<typeof flush>[0];
  /** @react-native-community/netinfo module (passed to avoid hard import) */
  netInfo: NetInfoModule;
  /** Called after a successful flush */
  onFlush?: (result: FlushResult) => void;
  /** Called on flush error */
  onError?: (error: unknown) => void;
  /** Auto-flush interval in ms when online (default: 30000 = 30s) */
  flushInterval?: number;
}

export interface UseOfflineSyncReturn {
  isOnline: boolean;
  queueSize: number;
  lastFlushAt: Date | null;
  isFlushing: boolean;
  forceFlush: () => Promise<FlushResult | null>;
}

export function useOfflineSync(options: UseOfflineSyncOptions): UseOfflineSyncReturn {
  const { supabase, netInfo, onFlush, onError, flushInterval = 30_000 } = options;

  const [isOnline, setIsOnline] = useState(true);
  const [queueSize, setQueueSize] = useState(0);
  const [lastFlushAt, setLastFlushAt] = useState<Date | null>(null);
  const [isFlushing, setIsFlushing] = useState(false);
  const flushingRef = useRef(false);

  const doFlush = useCallback(async (): Promise<FlushResult | null> => {
    if (flushingRef.current) return null;
    flushingRef.current = true;
    setIsFlushing(true);

    try {
      const size = await getQueueSize();
      if (size === 0) {
        setQueueSize(0);
        return null;
      }

      const result = await flush(supabase);
      setQueueSize(result.remaining);
      setLastFlushAt(new Date());
      onFlush?.(result);
      return result;
    } catch (err) {
      onError?.(err);
      return null;
    } finally {
      flushingRef.current = false;
      setIsFlushing(false);
    }
  }, [supabase, onFlush, onError]);

  // Update queue size on mount
  useEffect(() => {
    getQueueSize().then(setQueueSize).catch(() => {});
  }, []);

  // Listen to connectivity changes
  useEffect(() => {
    const unsubscribe = netInfo.addEventListener((state: NetInfoState) => {
      const online = !!(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);

      // Came back online → flush immediately
      if (online) {
        doFlush().catch(() => {});
      }
    });

    // Initial fetch
    netInfo.fetch().then((state: NetInfoState) => {
      setIsOnline(!!(state.isConnected && state.isInternetReachable !== false));
    }).catch(() => {});

    return unsubscribe;
  }, [netInfo, doFlush]);

  // Auto-flush on interval when online
  useEffect(() => {
    if (!isOnline || flushInterval <= 0) return undefined;

    const timer = setInterval(() => {
      doFlush().catch(() => {});
    }, flushInterval);

    return () => clearInterval(timer);
  }, [isOnline, flushInterval, doFlush]);

  // Flush when app comes to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isOnline) {
        doFlush().catch(() => {});
      }
    });
    return () => sub.remove();
  }, [isOnline, doFlush]);

  // Refresh queue size after any flush
  useEffect(() => {
    if (!isFlushing) {
      getQueueSize().then(setQueueSize).catch(() => {});
    }
  }, [isFlushing]);

  return {
    isOnline,
    queueSize,
    lastFlushAt,
    isFlushing,
    forceFlush: doFlush,
  };
}
