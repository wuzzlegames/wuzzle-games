// Hook for monitoring connection status
import { useState, useEffect, useRef } from 'react';
import { defaultStateSync } from '../lib/stateSync';

/**
 * Hook to monitor online/offline connection status
 * @returns {Object} Connection status and queue information
 */
export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [queueSize, setQueueSize] = useState(0);
  const isOnlineRef = useRef(isOnline);
  const lastQueueSizeRef = useRef(0);

  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Process queued updates when coming back online
      defaultStateSync.processQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update queue size periodically. Skip setState when online with no queued
    // updates to avoid redundant re-renders (only run updates when hasQueuedUpdates).
    const interval = setInterval(() => {
      const size = defaultStateSync.getQueueSize();
      const skip = isOnlineRef.current && size === 0 && lastQueueSizeRef.current === 0;
      if (!skip) {
        lastQueueSizeRef.current = size;
        setQueueSize(size);
      }
    }, 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return {
    isOnline,
    queueSize,
    hasQueuedUpdates: queueSize > 0,
  };
}
