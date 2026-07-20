/**
 * Single source of truth for data-visualisation colour.
 *
 * Every value here is a `var(--…)` reference rather than a literal hex, so a
 * chart re-themes automatically when the document flips to dark mode — CSS
 * custom properties resolve fine in SVG `fill`/`stroke` attributes and in
 * inline `style` objects, which is all recharts and our own markup use.
 *
 * Two palettes, and they must never be mixed:
 *
 *   SERIES  — categorical. Answers "which thing is this?". Assign in the fixed
 *             order below and never cycle; a chart that needs more than five
 *             slots should group its tail into an "Other" bucket instead.
 *             Slot 1 is the brand ruby; the remaining hues rotate away from red
 *             so that no data series can be misread as an error state.
 *
 *   STATUS  — reserved. Answers "how healthy is this?". Never reuse a status
 *             colour as a series colour. `critical` is the DANGER red, not the
 *             brand ruby, so a failing metric reads as a problem rather than as
 *             product identity.
 *
 * Both palettes were checked with the dataviz validator in light and dark
 * against their real surfaces (#ffffff / #1a2632) for lightness banding, chroma
 * floor, colour-vision-deficiency separation and contrast. STATUS additionally
 * encodes severity in lightness, so its ranking survives CVD — but that is only
 * legal where the numeric value is printed next to the mark. Keep those labels.
 */

/** Categorical series colours, in assignment order. */
export const SERIES = [
  'var(--chart-1)', // ruby (brand anchor)
  'var(--chart-2)', // violet
  'var(--chart-3)', // teal
  'var(--chart-4)', // amber
  'var(--chart-5)', // blue
];

/** Reserved performance/status colours. */
export const STATUS = {
  good: 'var(--chart-good)',
  warning: 'var(--chart-warning)',
  critical: 'var(--chart-critical)',
  empty: 'var(--chart-empty)',
};

/** Recessive chart furniture — grid lines, axis ticks. */
export const AXIS = {
  grid: 'var(--chart-grid)',
  tick: 'var(--chart-tick)',
};

/**
 * Pick a series colour by index. Returns `null` past the end of the palette
 * rather than wrapping around, because a cycled palette silently gives two
 * different entities the same colour.
 */
export function seriesColor(index) {
  return SERIES[index] ?? null;
}

/**
 * Map an accuracy percentage (0–100) onto the reserved status scale.
 * `total` is the number of answered questions; zero means "no data", which is
 * a distinct state from "scored badly" and must not be painted as critical.
 */
export function accuracyColor(accuracy, total = 1) {
  if (!total) return STATUS.empty;
  if (accuracy >= 80) return STATUS.good;
  if (accuracy >= 60) return STATUS.warning;
  return STATUS.critical;
}
