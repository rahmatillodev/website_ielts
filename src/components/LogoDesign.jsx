import React from "react";

/**
 * The EDU logo.
 *
 * This used to draw the mark in code — a book glyph inside a coloured circle
 * plus an "ieltscore." wordmark built from styled spans — which meant the logo
 * drifted with whatever the brand hex happened to be. It now renders the real
 * asset, so the logo is a fixed artwork and the brand colour is sampled FROM it
 * (#e30613, see the brand ramp in src/index.css) rather than the other way
 * round.
 *
 * Variants:
 *   red   — the default wordmark, for light surfaces
 *   white — the same wordmark knocked out, for dark or brand-filled surfaces
 *   icon  — the square badge, for tight spots (favicon, avatars, collapsed nav)
 *
 * Both wordmark files are transparent-background at a 2.264:1 ratio, so height
 * is the controlling dimension and width follows; never set both.
 */

const ASSETS = {
  red: "/logo-wordmark-red.png",
  white: "/logo-wordmark-white.png",
  icon: "/logo-icon.png",
};

const LogoDesign = ({
  className = "",
  compact = false,
  variant = "red",
  alt = "EDU",
  /* Legacy props from the drawn-in-code version. The logo is a fixed asset now,
     so per-instance colouring no longer applies; they are accepted and ignored
     so existing call sites keep working. */
  iconSize: _iconSize,
  textSize: _textSize,
  color: _color,
  iconColor: _iconColor,
}) => {
  const isIcon = variant === "icon";
  const src = ASSETS[variant] ?? ASSETS.red;

  // The icon is square and sized on both axes; the wordmark is sized by height
  // only so its aspect ratio is never squashed.
  const size = isIcon
    ? `${compact ? "h-8 w-8" : "h-10 w-10"} rounded-lg`
    : `${compact ? "h-6" : "h-8"} w-auto`;

  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      className={`${size} shrink-0 select-none object-contain ${className}`}
    />
  );
};

export default LogoDesign;
