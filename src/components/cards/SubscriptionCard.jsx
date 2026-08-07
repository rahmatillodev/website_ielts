import React, { useMemo } from "react";
import { format, differenceInCalendarDays } from "date-fns";
import { FaCrown } from "react-icons/fa";

/**
 * The subscription panel on Profile Settings.
 *
 * Deliberately small. It used to be a wide editorial card with a 2px progress
 * rail, a travelling dot and a "% remaining" readout, sitting in the same row as
 * the avatar — which made the plan the loudest thing on a page that is really
 * about editing your details. None of that helped: what a subscriber wants here
 * is when it ends and how long that is, and a percentage of an arbitrary span
 * answers neither.
 *
 * So: plan, expiry date, days left. Nothing else.
 */

/** Days from today until the plan lapses, floored at 0. */
function daysUntil(expiry) {
  return Math.max(0, differenceInCalendarDays(expiry, new Date()));
}

/**
 * @param {object}        props
 * @param {boolean}       props.isPremium
 * @param {Date|null}     props.premiumUntil  when the plan lapses, if it does
 * @param {() => void}    [props.onUpgrade]   opens the existing upgrade dialog
 */
const SubscriptionCard = ({ isPremium, premiumUntil = null, onUpgrade, className = "" }) => {
  const daysLeft = useMemo(
    () => (premiumUntil ? daysUntil(premiumUntil) : null),
    [premiumUntil]
  );

  // Under a fortnight is worth flagging; anything longer is just information and
  // should not wear an alarm colour.
  const isEndingSoon = daysLeft !== null && daysLeft <= 14;

  return (
    <section
      className={`bg-white border border-gray-100 rounded-[24px] p-6 shadow-sm ${className}`}
      aria-labelledby="subscription-heading"
    >
      <h2 id="subscription-heading" className="text-base font-black text-gray-900">
        Subscription
      </h2>

      {/* Plan, expiry and days left read as one list of three facts. The plan
          deliberately is NOT a second filled badge — the page header already
          carries one, and two solid brand pills a few hundred pixels apart made
          the plan shout twice on a screen that is about editing your details.
          The crown alone is enough of an accent here. */}
      <dl className="mt-4 space-y-3">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-sm font-medium text-gray-500">Current plan</dt>
          <dd className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-900">
            {isPremium ? <FaCrown className="w-3 h-3 shrink-0 text-primary" aria-hidden /> : null}
            {isPremium ? "Premium" : "Free"}
          </dd>
        </div>

        {isPremium ? (
          premiumUntil ? (
            <>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-sm font-medium text-gray-500">Expires</dt>
                <dd className="text-sm font-bold text-gray-900 tabular-nums">
                  {format(premiumUntil, "d MMM yyyy")}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-sm font-medium text-gray-500">Days remaining</dt>
                <dd
                  className={`text-sm font-bold tabular-nums ${
                    isEndingSoon ? "text-warning-700" : "text-gray-900"
                  }`}
                >
                  {daysLeft}
                </dd>
              </div>
            </>
          ) : (
            // Granted with no end date: there is no countdown to show, and an
            // empty "Expires —" row would only raise a question.
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-sm font-medium text-gray-500">Expires</dt>
              <dd className="text-sm font-bold text-gray-900">Never</dd>
            </div>
          )
        ) : null}
      </dl>

      {!isPremium && onUpgrade ? (
        <div className="mt-5 border-t border-gray-100 pt-5">
          <p className="text-sm font-medium text-gray-500">
            Unlock every practice test, podcast and shadowing lesson.
          </p>
          <button
            type="button"
            onClick={onUpgrade}
            className="mt-4 w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Upgrade to Pro
          </button>
        </div>
      ) : null}
    </section>
  );
};

export default SubscriptionCard;
