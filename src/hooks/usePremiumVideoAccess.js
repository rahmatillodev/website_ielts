import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import supabase from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { isPremiumSubscriber } from "@/utils/isPremiumSubscriber";

/**
 * Resolves whether the current speaking video is premium and if the user may watch it.
 * Used by shadowing/podcast players to block free users on premium content.
 */
export function usePremiumVideoAccess() {
  const location = useLocation();
  const statePremium = location.state?.isPremium === true;
  const testId = location.state?.testId;

  const userProfile = useAuthStore((state) => state.userProfile);
  const isProUser = isPremiumSubscriber(userProfile);

  const [isPremiumContent, setIsPremiumContent] = useState(statePremium);
  const [resolved, setResolved] = useState(!testId || statePremium);

  useEffect(() => {
    if (!testId) {
      setResolved(true);
      return;
    }
    if (statePremium) {
      setIsPremiumContent(true);
      setResolved(true);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("test")
        .select("is_premium")
        .eq("id", testId)
        .maybeSingle();

      if (!cancelled) {
        setIsPremiumContent(Boolean(data?.is_premium));
        setResolved(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [testId, statePremium]);

  const accessDenied = resolved && isPremiumContent && !isProUser;

  return { accessDenied, checking: !resolved };
}
