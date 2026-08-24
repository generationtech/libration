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
 * Trackable map object identity and resolution (LIB-088 / LIB-089).
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
 * Moon as it moves. Production identities here are `moon`, `sun`, and `iss`.
 * Earth-fixed is not a target. This module is not a plugin registry.
 *
 * Resolution consumes already-authoritative product state. It does not
 * recompute astronomy or orbital mechanics. ISS coordinates are supplied
 * by the caller from the existing ISS lifecycle path; they are never
 * invented here.
 */

import { sublunarPoint } from "./sublunarPoint";
import { subsolarPoint } from "./subsolarPoint";

export const TRACKABLE_MAP_OBJECT_IDS = ["moon", "sun", "iss"] as const;

/** Stable production identities. City/planet/Milky Way values are not added here. */
export type TrackableMapObjectId = (typeof TRACKABLE_MAP_OBJECT_IDS)[number];

/** Canonical geographic position used as resolved anchor state. */
export type TrackableMapObjectCanonicalPosition = {
  readonly lonDeg: number;
  readonly latDeg: number;
};

/**
 * Authoritative lon/lat already computed for the frame instant.
 * Callers supply existing product state; they do not invent a second ephemeris.
 * ISS is nullable: tracking is unavailable when no valid position exists.
 */
export type TrackableMapObjectAuthoritativeState = {
  readonly moon: TrackableMapObjectCanonicalPosition;
  readonly sun: TrackableMapObjectCanonicalPosition;
  readonly iss: TrackableMapObjectCanonicalPosition | null;
};

export function isTrackableMapObjectId(value: string): value is TrackableMapObjectId {
  return value === "moon" || value === "sun" || value === "iss";
}

/**
 * Map a target identity onto already-authoritative canonical coordinates.
 *
 * Object-specific knowledge lives here. Reference-frame math must not.
 * Returns `null` only when the target is ISS and no valid position was supplied.
 * Never fabricates ISS coordinates.
 */
export function resolveTrackableMapObject(
  target: "moon" | "sun",
  state: TrackableMapObjectAuthoritativeState,
): TrackableMapObjectCanonicalPosition;
export function resolveTrackableMapObject(
  target: TrackableMapObjectId,
  state: TrackableMapObjectAuthoritativeState,
): TrackableMapObjectCanonicalPosition | null;
export function resolveTrackableMapObject(
  target: TrackableMapObjectId,
  state: TrackableMapObjectAuthoritativeState,
): TrackableMapObjectCanonicalPosition | null {
  switch (target) {
    case "moon":
      return { lonDeg: state.moon.lonDeg, latDeg: state.moon.latDeg };
    case "sun":
      return { lonDeg: state.sun.lonDeg, latDeg: state.sun.latDeg };
    case "iss":
      return state.iss === null
        ? null
        : { lonDeg: state.iss.lonDeg, latDeg: state.iss.latDeg };
  }
}

/** Gather Moon/Sun authorities. ISS must be supplied from the existing ISS pipeline. */
export function trackableMapObjectAuthoritativeStateAt(
  canonicalInstantMs: number,
  iss: TrackableMapObjectCanonicalPosition | null = null,
): TrackableMapObjectAuthoritativeState {
  const moon = sublunarPoint(canonicalInstantMs);
  const sun = subsolarPoint(canonicalInstantMs);
  return {
    moon: { lonDeg: moon.lonDeg, latDeg: moon.latDeg },
    sun: { lonDeg: sun.lonDeg, latDeg: sun.latDeg },
    iss,
  };
}

export function resolveTrackableMapObjectAtInstant(
  target: "moon" | "sun",
  canonicalInstantMs: number,
  iss?: TrackableMapObjectCanonicalPosition | null,
): TrackableMapObjectCanonicalPosition;
export function resolveTrackableMapObjectAtInstant(
  target: TrackableMapObjectId,
  canonicalInstantMs: number,
  iss?: TrackableMapObjectCanonicalPosition | null,
): TrackableMapObjectCanonicalPosition | null;
export function resolveTrackableMapObjectAtInstant(
  target: TrackableMapObjectId,
  canonicalInstantMs: number,
  iss: TrackableMapObjectCanonicalPosition | null = null,
): TrackableMapObjectCanonicalPosition | null {
  return resolveTrackableMapObject(
    target,
    trackableMapObjectAuthoritativeStateAt(canonicalInstantMs, iss),
  );
}
