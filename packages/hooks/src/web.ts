'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@onsite/supabase/client';
import type { User } from '@supabase/supabase-js';

/**
 * Hook for current authenticated user (web/Next.js only).
 * Uses @onsite/supabase/client — not available in React Native.
 */
export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}

/**
 * Hook for local storage (web only).
 * SSR-safe — returns initialValue during SSR.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue] as const;
}

/**
 * Hook for copy to clipboard (web only).
 * Uses navigator.clipboard API.
 */
export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return true;
    } catch {
      return false;
    }
  }, []);

  return { copied, copy };
}

/**
 * Hook for Supabase realtime subscriptions (web only).
 * Uses @onsite/supabase/client — not available in React Native.
 */
export function useRealtimeSubscription<T>(
  table: string,
  callback: (payload: T) => void
) {
  useEffect(() => {
    const supabase = createClient();

    const subscription = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => callback(payload.new as T)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [table, callback]);
}
