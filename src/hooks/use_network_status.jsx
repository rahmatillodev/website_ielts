'use client';
import { useSyncExternalStore, useEffect, useState, useCallback } from "react";

/**
 * Derives speed tier from Network Information API when available.
 * @returns {'slow' | 'normal' | 'fast'}
 */
function getSpeedFromConnection() {
  if (typeof navigator === 'undefined' || !navigator.connection) {
    return 'normal';
  }
  const conn = navigator.connection;
  // effectiveType: '4g' | '3g' | '2g' | 'slow-2g'
  const effectiveType = conn.effectiveType;
  if (effectiveType === '4g') return 'fast';
  if (effectiveType === '3g') return 'normal';
  if (effectiveType === '2g' || effectiveType === 'slow-2g') return 'slow';
  // Fallback: use downlink (Mbps) if available
  const downlink = conn.downlink;
  if (typeof downlink === 'number') {
    if (downlink >= 5) return 'fast';
    if (downlink >= 1) return 'normal';
    return 'slow';
  }
  return 'normal';
}

/**
 * Custom hook that returns online status and connection speed.
 * - isOnline: true when there is internet, false when offline.
 * - speed: 'slow' | 'normal' | 'fast' (only meaningful when isOnline; when offline can be ignored).
 */
function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [speed, setSpeed] = useState('normal');

  const updateSpeed = useCallback(() => {
    setSpeed(getSpeedFromConnection());
  }, []);

  const navigatorOnline = useSyncExternalStore(
    (cb) => {
      window.addEventListener('online', cb);
      window.addEventListener('offline', cb);
      const conn = typeof navigator !== 'undefined' && navigator.connection;
      if (conn && typeof conn.addEventListener === 'function') {
        conn.addEventListener('change', cb);
      }
      return () => {
        window.removeEventListener("online", cb);
        window.removeEventListener("offline", cb);
        if (conn && typeof conn.removeEventListener === 'function') {
          conn.removeEventListener('change', cb);
        }
      };
    },
    () => navigator.onLine,
    () => true
  );

  useEffect(() => {
    if (navigatorOnline) {
      setIsOnline(true);
      updateSpeed();
    } else {
      const verifyOffline = async () => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          await fetch('https://www.google.com/favicon.ico?' + Date.now(), {
            method: 'HEAD',
            mode: 'no-cors',
            signal: controller.signal,
            cache: 'no-cache'
          });
          clearTimeout(timeoutId);
          setIsOnline(true);
          updateSpeed();
        } catch (error) {
          setIsOnline(false);
        }
      };
      verifyOffline();
    }
  }, [navigatorOnline, updateSpeed]);

  return { isOnline, speed };
}

export default useNetworkStatus;
