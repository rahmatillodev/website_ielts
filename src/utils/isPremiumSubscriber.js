/**
 * Active premium subscription from `users` profile (same source as TestsLibraryPage).
 * authStore.fetchUserProfile normalizes vip → premium and clears expired plans.
 */
export function isPremiumSubscriber(userProfile) {
  if (!userProfile) return false;
  const status = String(userProfile.subscription_status ?? "").toLowerCase();
  return status === "premium";
}
