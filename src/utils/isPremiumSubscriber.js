import { isPremiumProfile } from "@/utils/premiumSubscription";

/**
 * Active premium subscription from the `users` profile.
 *
 * Now date-aware: a row still labelled premium whose `premium_until` has passed
 * reads as free here, without waiting for the store to refresh or for the
 * database sweep to clear it. See utils/premiumSubscription.js.
 */
export function isPremiumSubscriber(userProfile) {
  return isPremiumProfile(userProfile);
}
