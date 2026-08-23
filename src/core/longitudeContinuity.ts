/*
 * Libration
 * Copyright (C) 2026 Ken McDonald
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 */

/**
 * Longitude primitives for the scene/map reference-frame layer.
 *
 * These are not camera wrapping (LIB-081 display copies of the projected strip)
 * and not civil-time “reference” (display zone / reference city).
 *
 * Named kinds of value:
 *
 * - **Canonical longitude** — geographic east longitude in (−180, 180].
 *   `+180` is kept; `−180` maps to `+180`. This is a wrapped meridian, not a
 *   continuous world coordinate.
 * - **Wrapped longitude delta** — shortest signed eastward difference in
 *   (−180, 180]. Exactly 180° is represented as `+180` (east).
 * - **Continuous / unwrapped longitude** — a real-valued longitude that may
 *   leave (−180, 180] (181, 541, −540, …). Equivalent meridians differ by
 *   360k. Use this for an entity-fixed *anchor* that must cross the
 *   antimeridian without jumping.
 * - **Nearest equivalent longitude** — the continuous value equivalent to a
 *   given meridian that is closest to a *near* (usually continuous) longitude.
 *
 * Do not pass a continuous value to a helper that canonicalizes when continuity
 * is required, and do not treat `canonicalLongitudeDeg` as a continuity tool.
 * Latitude is not wrapped.
 */

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

/**
 * Bring a signed longitude difference (or a longitude) into (−180, 180].
 * Exactly −180 is folded to +180 so the interval is left-open.
 */
function wrappedIntoSignedHalfTurn(deg: number): number {
  let d = finiteOr(deg, 0);
  if (!Number.isFinite(d)) {
    return 0;
  }
  while (d <= -180) {
    d += 360;
  }
  while (d > 180) {
    d -= 360;
  }
  return d;
}

/**
 * Canonical east longitude in (−180, 180].
 * `+180` is kept; `−180` and other left-edge antimeridian equivalents map to `+180`.
 */
export function canonicalLongitudeDeg(lonDeg: number): number {
  return wrappedIntoSignedHalfTurn(lonDeg);
}

/**
 * Shortest signed eastward delta from `fromDeg` to `toDeg`, in (−180, 180].
 *
 * Inputs may be canonical or continuous; the result is always a wrapped delta,
 * never a multi-turn continuous difference. Use
 * {@link relativeLongitudeFromContinuousAnchorDeg} when the subtractive
 * remainder must stay continuous across the antimeridian.
 */
export function wrappedLongitudeDeltaDeg(fromDeg: number, toDeg: number): number {
  return wrappedIntoSignedHalfTurn(finiteOr(toDeg, 0) - finiteOr(fromDeg, 0));
}

/**
 * Longitude equivalent to `lonDeg` (same meridian, plus 360k) nearest to
 * `nearDeg`. The result is **continuous**, not canonical.
 *
 * Example: `nearestEquivalentLongitudeDeg(-179, 181) === 181`.
 * A 180° tie is resolved eastward (`nearDeg + 180`).
 */
export function nearestEquivalentLongitudeDeg(lonDeg: number, nearDeg: number): number {
  const near = finiteOr(nearDeg, 0);
  return near + wrappedLongitudeDeltaDeg(near, finiteOr(lonDeg, 0));
}

/**
 * Advance a continuous/unwrapped longitude so it follows `nextCanonicalDeg`
 * without jumping ±360° when the canonical value wraps at ±180°.
 *
 * `179 → 180 → -179 → -178` (canonical) becomes `179 → 180 → 181 → 182`.
 */
export function continuousLongitudeFollowingCanonicalDeg(
  previousContinuousDeg: number,
  nextCanonicalDeg: number,
): number {
  return nearestEquivalentLongitudeDeg(nextCanonicalDeg, previousContinuousDeg);
}

/**
 * Relative longitude of a geographic point versus a **continuous** anchor:
 *
 * `Δλ = nearestEquivalent(λ, λa_continuous) − λa_continuous`
 *
 * The result is continuous and is **not** wrapped to ±180. A point on the
 * same meridian as the anchor yields `0` even when the canonical value is
 * `−179` and the continuous anchor is `181`.
 *
 * This is the subtractive rule a future entity-fixed frame will use for
 * longitude. Latitude-relative behaviour is intentionally deferred.
 */
export function relativeLongitudeFromContinuousAnchorDeg(
  lonDeg: number,
  continuousAnchorLonDeg: number,
): number {
  const anchor = finiteOr(continuousAnchorLonDeg, 0);
  return nearestEquivalentLongitudeDeg(finiteOr(lonDeg, 0), anchor) - anchor;
}
