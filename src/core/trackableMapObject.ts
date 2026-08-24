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
 * Trackable map object identity and resolution (LIB-088 / LIB-089 / LIB-092).
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
 * Moon as it moves; a city remains that city. Named identities are `moon`,
 * `sun`, and `iss`. Cities and planets use structured identities that reuse
 * canonical `CityPinEntry.id` and `PlanetaryBodyId`. Earth-fixed is not a
 * target. This module is not a plugin registry.
 *
 * Resolution consumes already-authoritative product state. It does not
 * recompute astronomy or orbital mechanics. ISS, city, and planet coordinates
 * are supplied by the caller from existing product paths; they are never
 * invented here.
 */

import { isPlanetaryBodyId, type PlanetaryBodyId } from "./planetaryBodies";
import { sublunarPoint } from "./sublunarPoint";
import { subsolarPoint } from "./subsolarPoint";

export const TRACKABLE_MAP_OBJECT_IDS = ["moon", "sun", "iss"] as const;

/** Named production identities (Moon, Sun, ISS). */
export type NamedTrackableMapObjectId = (typeof TRACKABLE_MAP_OBJECT_IDS)[number];

export type CityTrackableMapObjectId = {
  readonly kind: "city";
  readonly id: string;
};

export type PlanetTrackableMapObjectId = {
  readonly kind: "planet";
  readonly id: PlanetaryBodyId;
};

/**
 * Stable production identities. Structured city/planet values reuse canonical
 * pin and body ids. Do not compare structured values with `===`.
 */
export type TrackableMapObjectId =
  | NamedTrackableMapObjectId
  | CityTrackableMapObjectId
  | PlanetTrackableMapObjectId;

/** Canonical geographic position used as resolved anchor state. */
export type TrackableMapObjectCanonicalPosition = {
  readonly lonDeg: number;
  readonly latDeg: number;
};

/**
 * Authoritative lon/lat already computed for the frame instant.
 * Callers supply existing product state; they do not invent a second ephemeris.
 * ISS/city/planet entries are omitted or empty when unavailable; never fabricate.
 */
export type TrackableMapObjectAuthoritativeState = {
  readonly moon: TrackableMapObjectCanonicalPosition;
  readonly sun: TrackableMapObjectCanonicalPosition;
  readonly iss: TrackableMapObjectCanonicalPosition | null;
  readonly cities?: ReadonlyMap<string, TrackableMapObjectCanonicalPosition>;
  readonly planets?: ReadonlyMap<PlanetaryBodyId, TrackableMapObjectCanonicalPosition>;
};

export function cityTrackableMapObjectId(id: string): CityTrackableMapObjectId {
  return { kind: "city", id };
}

export function planetTrackableMapObjectId(id: PlanetaryBodyId): PlanetTrackableMapObjectId {
  return { kind: "planet", id };
}

export function isNamedTrackableMapObjectId(value: unknown): value is NamedTrackableMapObjectId {
  return value === "moon" || value === "sun" || value === "iss";
}

export function isTrackableMapObjectId(value: unknown): value is TrackableMapObjectId {
  if (isNamedTrackableMapObjectId(value)) {
    return true;
  }
  if (value === null || typeof value !== "object") {
    return false;
  }
  const rec = value as { kind?: unknown; id?: unknown };
  if (rec.kind === "city") {
    return typeof rec.id === "string" && rec.id.length > 0;
  }
  if (rec.kind === "planet") {
    return typeof rec.id === "string" && isPlanetaryBodyId(rec.id);
  }
  return false;
}

/**
 * Semantic identity equality. Structured city/planet ids compare by kind+id,
 * not object reference.
 */
export function trackableMapObjectIdEquals(
  a: TrackableMapObjectId | null,
  b: TrackableMapObjectId | null,
): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  if (typeof a === "string" || typeof b === "string") {
    return a === b;
  }
  return a.kind === b.kind && a.id === b.id;
}

/**
 * Deterministic overlap tie key: named Moon/Sun/ISS first (existing order),
 * then planets, then cities. Not a hand-maintained global target list.
 */
export function trackableMapObjectIdTieKey(target: TrackableMapObjectId): string {
  if (target === "moon") {
    return "0:0:moon";
  }
  if (target === "sun") {
    return "0:1:sun";
  }
  if (target === "iss") {
    return "0:2:iss";
  }
  if (target.kind === "planet") {
    return `1:${target.id}`;
  }
  return `2:${target.id}`;
}

/**
 * Map a target identity onto already-authoritative canonical coordinates.
 *
 * Object-specific knowledge lives here. Reference-frame math must not.
 * Returns `null` when the target has no supplied valid position (ISS, missing
 * city, or planet without a current mapped point). Never fabricates coordinates.
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
  if (target === "moon") {
    return { lonDeg: state.moon.lonDeg, latDeg: state.moon.latDeg };
  }
  if (target === "sun") {
    return { lonDeg: state.sun.lonDeg, latDeg: state.sun.latDeg };
  }
  if (target === "iss") {
    return state.iss === null
      ? null
      : { lonDeg: state.iss.lonDeg, latDeg: state.iss.latDeg };
  }
  if (target.kind === "city") {
    const pos = state.cities?.get(target.id);
    return pos === undefined ? null : { lonDeg: pos.lonDeg, latDeg: pos.latDeg };
  }
  const pos = state.planets?.get(target.id);
  return pos === undefined ? null : { lonDeg: pos.lonDeg, latDeg: pos.latDeg };
}

export type TrackableMapObjectAuthoritativeExtras = {
  readonly cities?: ReadonlyMap<string, TrackableMapObjectCanonicalPosition>;
  readonly planets?: ReadonlyMap<PlanetaryBodyId, TrackableMapObjectCanonicalPosition>;
};

/** Gather Moon/Sun authorities. ISS, cities, and planets come from existing product paths. */
export function trackableMapObjectAuthoritativeStateAt(
  canonicalInstantMs: number,
  iss: TrackableMapObjectCanonicalPosition | null = null,
  extras?: TrackableMapObjectAuthoritativeExtras,
): TrackableMapObjectAuthoritativeState {
  const moon = sublunarPoint(canonicalInstantMs);
  const sun = subsolarPoint(canonicalInstantMs);
  return {
    moon: { lonDeg: moon.lonDeg, latDeg: moon.latDeg },
    sun: { lonDeg: sun.lonDeg, latDeg: sun.latDeg },
    iss,
    ...(extras?.cities !== undefined ? { cities: extras.cities } : {}),
    ...(extras?.planets !== undefined ? { planets: extras.planets } : {}),
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
  extras?: TrackableMapObjectAuthoritativeExtras,
): TrackableMapObjectCanonicalPosition | null;
export function resolveTrackableMapObjectAtInstant(
  target: TrackableMapObjectId,
  canonicalInstantMs: number,
  iss: TrackableMapObjectCanonicalPosition | null = null,
  extras?: TrackableMapObjectAuthoritativeExtras,
): TrackableMapObjectCanonicalPosition | null {
  return resolveTrackableMapObject(
    target,
    trackableMapObjectAuthoritativeStateAt(canonicalInstantMs, iss, extras),
  );
}
