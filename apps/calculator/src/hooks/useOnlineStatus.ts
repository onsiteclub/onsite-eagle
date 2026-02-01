// src/hooks/useOnlineStatus.ts
// Hook para monitorar status de conexão

import { useState, useEffect } from 'react';
import { logger } from '../lib/logger';

/**
 * Hook que monitora se o dispositivo está online
 * @returns boolean indicando status de conexão
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      logger.sync.online();
    };
    const handleOffline = () => {
      setIsOnline(false);
      logger.sync.offline();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
