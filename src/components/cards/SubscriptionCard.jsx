import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { format, differenceInCalendarDays } from "date-fns";

/**
 * The premium subscription container on the profile screen.
 *
 * Ported from the `Subscription Card.dc.html` design (claude.ai/design project
 * aeed69aa): flat editorial card, square corners, IBM Plex Mono for the labels
 * and a 2px rail with a travelling dot rather than a filled progress bar. The
 * palette is pinned to the design's literal hexes — the app is light-only
 * (`<meta name="color-scheme" content="light">`, and nothing ever puts a `dark`
 * class on the document), so there is no dark variant to satisfy.
 *
 * The card owns its own date math on purpose. The design hardcoded a 731-day
 * plan; a real subscription's span is whatever sits between `premium_started_at`
 * and `premium_until`, and the figure the design labels "days left" has to count
 * from today, not across the whole plan.
 */

/** Days from today until the plan lapses, floored at 0. */
function daysUntil(expiry) {
  return Math.max(0, differenceInCalendarDays(expiry, new Date()));
}

/**
 * Share of the plan still unused, 0–100, or null when it cannot be known.
 *
 * A plan with no recorded start (manually granted with only an end date) has no
 * span to measure against, so there is no honest percentage to show — the rail
 * is dropped rather than filled with a made-up number. Clamped at both ends
 * because a plan extended without moving its start would otherwise read >100%.
 */
function percentRemaining(start, expiry) {
  if (!start) return null;
  const totalDays = differenceInCalendarDays(expiry, start);
  if (totalDays <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((daysUntil(expiry) / totalDays) * 100)));
}

const SubscriptionCard = ({ premiumUntil, premiumStart = null, className = "" }) => {
  const { daysLeft, percent } = useMemo(
    () =>
      premiumUntil
        ? {
            daysLeft: daysUntil(premiumUntil),
            percent: percentRemaining(premiumStart, premiumUntil),
          }
        : { daysLeft: 0, percent: null },
    [premiumUntil, premiumStart]
  );

  // A premium plan with no end date (lifetime / manually granted) has nothing to
  // count down, and the design has no state for it.
  if (!premiumUntil) return null;

  return (
    <motion.div
      className={`w-full max-w-[560px] border border-[#e8e5e0] bg-white px-10 pt-9 pb-8 ${className}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
    >
      <div className="flex items-start justify-between gap-6">
        <div className="flex flex-col gap-1.5">
          <div className="font-mono text-[11px] tracking-[0.14em] uppercase text-[#c81e1e]">
            Premium
          </div>
          <div className="text-[20px] font-semibold tracking-[-0.01em] text-[#191817]">
            Subscription
          </div>
          <div className="text-[13px] text-[#8a857e]">
            Expires {format(premiumUntil, "MMMM dd, yyyy")}
          </div>
        </div>

        <div className="flex flex-col items-end gap-0.5">
          <div className="text-[40px] leading-none font-semibold tracking-[-0.03em] tabular-nums text-[#191817]">
            {daysLeft}
          </div>
          <div className="font-mono text-[11px] tracking-[0.14em] uppercase text-[#8a857e]">
            {daysLeft === 1 ? "day left" : "days left"}
          </div>
        </div>
      </div>

      {percent !== null && (
        <div className="mt-8 flex flex-col gap-2.5">
          <div className="relative h-[2px] bg-[#eeebe6]">
            <motion.div
              className="absolute top-0 bottom-0 left-0 bg-[#c81e1e]"
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.9, delay: 0.6, ease: "easeOut" }}
            />
            <motion.div
              className="absolute -top-[3px] size-2 -translate-x-1/2 rounded-full bg-[#c81e1e]"
              initial={{ left: 0 }}
              animate={{ left: `${percent}%` }}
              transition={{ duration: 0.9, delay: 0.6, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between font-mono text-[11px] text-[#8a857e]">
            <span>{percent}% remaining</span>
            <span>{format(premiumUntil, "MMM yyyy")}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default SubscriptionCard;
