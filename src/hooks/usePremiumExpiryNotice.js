import { useCallback, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { premiumExpiryNoticeId } from "@/utils/premiumSubscription";

/**
 * "Your premium has ended" — shown once, when it ends.
 *
 * The trigger is `users.premium_expired_at`, written by the database the moment
 * a plan runs out and cleared again by a new grant. Reading the row rather than
 * watching the clock is what makes this survive the two cases a client-side
 * check loses: the scheduled sweep usually clears the plan before the student
 * next opens the app, and a student signing in on a new device has no cached
 * profile to compare against.
 *
 * "Once" is per notice, not per user: the id carries the exact expiry instant,
 * so a student who lapses, renews and lapses again is told each time, while a
 * reload or a second tab is not a second time.
 */
export const PREMIUM_EXPIRY_NOTICE_KEY = "premium_expiry_notice_seen";

/** localStorage is unavailable in private modes and can throw on read. */
const readSeen = () => {
  try {
    return localStorage.getItem(PREMIUM_EXPIRY_NOTICE_KEY);
  } catch {
    return null;
  }
};

const writeSeen = (value) => {
  try {
    localStorage.setItem(PREMIUM_EXPIRY_NOTICE_KEY, value);
  } catch {
    // Losing the marker only means the notice may appear once more. That is a
    // better failure than not showing it at all, so nothing else happens here.
  }
};

export function usePremiumExpiryNotice() {
  const userProfile = useAuthStore((state) => state.userProfile);
  const noticeId = premiumExpiryNoticeId(userProfile);

  // Read once, at mount. This hook is the only writer of the marker, so there
  // is nothing to re-read for: the profile arriving later changes the notice,
  // never what was already dismissed.
  const [dismissedId, setDismissedId] = useState(readSeen);

  const dismiss = useCallback(() => {
    if (!noticeId) return;
    writeSeen(noticeId);
    setDismissedId(noticeId);
  }, [noticeId]);

  return {
    isOpen: Boolean(noticeId) && noticeId !== dismissedId,
    dismiss,
  };
}

export default usePremiumExpiryNotice;
