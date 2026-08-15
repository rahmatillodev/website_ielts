import { useEffect, useState } from 'react';
import { TOUCH_PRIMARY_QUERY, isTouchPrimaryDevice } from '@/utils/pointerInput';

/**
 * True on touch-first devices (iPad, tablets, phones), false on laptops and
 * desktops regardless of window size.
 *
 * Capability-based: see TOUCH_PRIMARY_QUERY. It re-evaluates when the match
 * changes, so plugging a trackpad into an iPad flips it live rather than
 * leaving a touch-only control stranded on a pointer-driven device.
 */
export const useTouchPrimary = () => {
  const [isTouchPrimary, setIsTouchPrimary] = useState(isTouchPrimaryDevice);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;

    const query = window.matchMedia(TOUCH_PRIMARY_QUERY);
    const sync = () => setIsTouchPrimary(isTouchPrimaryDevice());

    sync();
    // Safari only grew addEventListener on MediaQueryList in 14; keep the
    // legacy path so older iPadOS still updates.
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', sync);
      return () => query.removeEventListener('change', sync);
    }
    query.addListener(sync);
    return () => query.removeListener(sync);
  }, []);

  return isTouchPrimary;
};

export default useTouchPrimary;
