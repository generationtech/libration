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
 * Trackable map object identity and resolution (LIB-088).
 *
 * A trackable map object is a rendered/physical object that can expose an
 * authoritative canonical geographic lon/lat for the current frame instant
 * and can therefore serve as an anchored scene-frame target.
 *
 * Three separate concepts:
 * - identity (`TrackableMapObjectId`) — which object is being tracked
 * - resolution — that object's canonical lon/lat at the frame instant
 * - `SceneReferenceFrame` — how already-resolved geography is expressed
 *
 * Identity is stable and independent of current coordinates. Moon remains
 * Moon as it moves. Production identities here are only `moon` and `sun`.
 * Earth-fixed is not a target. This module is not a plugin registry.
 *
 * Resolution consumes the same authoritative sublunar / subsolar state the
 * rest of the product already uses. It does not recompute astronomy.
 */

import { sublunarPoint } from "./sublunarPoint";
import { subsolarPoint } from "./subsolarPoint";

export const TRACKABLE_MAP_OBJECT_IDS = ["moon", "sun"] as const;

/** Stable production identities. ISS/city/planet values are not added here. */
export type TrackableMapObjectId = (typeof TRACKABLE_MAP_OBJECT_IDS)[number];

/** Canonical geographic position used as resolved anchor state. */
export type TrackableMapObjectCanonicalPosition = {
  readonly lonDeg: number;
  readonly latDeg: number;
};

/**
 * Authoritative lon/lat already computed for the frame instant.
 * Callers supply existing product state; they do not invent a second ephemeris.
 */
export type TrackableMapObjectAuthoritativeState = {
  readonly moon: TrackableMapObjectCanonicalPosition;
  readonly sun: TrackableMapObjectCanonicalPosition;
};

export function isTrackableMapObjectId(value: string): value is TrackableMapObjectId {
  return value === "moon" || value === "sun";
}

/**
 * Map a target identity onto already-authoritative canonical coordinates.
 *
 * Object-specific knowledge lives here. Reference-frame math must not.
 */
export function resolveTrackableMapObject(
  target: TrackableMapObjectId,
  state: TrackableMapObjectAuthoritativeState,
): TrackableMapObjectCanonicalPosition {
  switch (target) {
    case "moon":
      return { lonDeg: state.moon.lonDeg, latDeg: state.moon.latDeg };
    case "sun":
      return { lonDeg: state.sun.lonDeg, latDeg: state.sun.latDeg };
  }
}

/** Gather the Moon/Sun authoritative points the product already computes. */
export function trackableMapObjectAuthoritativeStateAt(
  canonicalInstantMs: number,
): TrackableMapObjectAuthoritativeState {
  const moon = sublunarPoint(canonicalInstantMs);
  const sun = subsolarPoint(canonicalInstantMs);
  return {
    moon: { lonDeg: moon.lonDeg, latDeg: moon.latDeg },
    sun: { lonDeg: sun.lonDeg, latDeg: sun.latDeg },
  };
}

export function resolveTrackableMapObjectAtInstant(
  target: TrackableMapObjectId,
  canonicalInstantMs: number,
): TrackableMapObjectCanonicalPosition {
  return resolveTrackableMapObject(
    target,
    trackableMapObjectAuthoritativeStateAt(canonicalInstantMs),
  );
}
