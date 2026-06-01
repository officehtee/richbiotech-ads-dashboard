/**
 * Compute offset (dx, dy) for an exploded donut slice.
 * Pure utility — easy to unit test.
 *
 * @param midAngleDeg  middle angle of the slice (Recharts uses degrees,
 *                     0° at +X axis, increasing counter-clockwise)
 * @param distance     pixels to push the slice outward
 */
export function computeExplodeOffset(
  midAngleDeg: number,
  distance: number,
): { dx: number; dy: number } {
  const rad = (midAngleDeg * Math.PI) / 180;
  // Recharts y axis points downward → invert sin
  return {
    dx: Math.cos(rad) * distance,
    dy: -Math.sin(rad) * distance,
  };
}

/**
 * Truncate a string to N characters, adding ellipsis when needed.
 */
export function truncateLabel(s: string, max: number): string {
  if (!s) return "";
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}
