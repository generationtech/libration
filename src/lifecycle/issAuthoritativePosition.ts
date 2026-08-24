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
 * LIB-089 — ISS tracking consumes the same authoritative geographic sample
 * the ISS overlay uses to paint the current glyph. This module does not
 * propagate an independent orbit. It applies existing paint-eligibility
 * rules and `resolveIssCurrentSample` at the canonical product instant.
 */

import type { TrackableMapObjectCanonicalPosition } from "../core/trackableMapObject";
import type { DynamicDataLifecycleAttachment } from "./dynamicDataLifecycleHostTypes";
import type { DynamicSourceLifecycleState } from "./dynamicLifecycleTypes";
import type { PreparedTracksView } from "./dynamicTracksMaterializer";
import { ISS_ORBITAL_TRACK_SOURCE_ID } from "./dynamicTracksSourceCatalog";
import { resolveIssCurrentSample } from "./issOrbitalTrackAcquisition";
import { issProvenanceFromPreparedTrack, issTrackShouldPaint } from "./issTrackProvenance";

export type IssAuthoritativePositionInputs = {
  readonly preparedTracks: PreparedTracksView | null;
  readonly lifecycleState: DynamicSourceLifecycleState;
  readonly productUtcMs: number;
};

/**
 * Canonical ISS lon/lat for tracking when the ISS overlay would itself
 * paint from a valid current sample at `productUtcMs`.
 *
 * Returns `null` when there is no prepared view, provenance forbids paint
 * (fixture, excessively stale TLE, empty tracks), or the current sample
 * cannot be resolved. Does not fabricate or reuse an arbitrary stale point.
 */
export function resolveAuthoritativeIssCanonicalPosition(
  inputs: IssAuthoritativePositionInputs,
): TrackableMapObjectCanonicalPosition | null {
  const prepared = inputs.preparedTracks;
  if (prepared === null) {
    return null;
  }
  const provenance = issProvenanceFromPreparedTrack({
    tracks: prepared.tracks,
    acquiredAtMs: prepared.validTimeMs,
    productUtcMs: inputs.productUtcMs,
    lifecycleState: inputs.lifecycleState,
  });
  if (provenance === null || !issTrackShouldPaint(provenance)) {
    return null;
  }
  const first = prepared.tracks[0];
  if (first === undefined) {
    return null;
  }
  const sample = resolveIssCurrentSample(first, inputs.productUtcMs);
  if (sample === null) {
    return null;
  }
  return { lonDeg: sample.lonDeg, latDeg: sample.latDeg };
}

export function resolveAuthoritativeIssCanonicalPositionFromAttachment(
  attachment: DynamicDataLifecycleAttachment | undefined,
  productUtcMs: number,
): TrackableMapObjectCanonicalPosition | null {
  if (attachment === undefined) {
    return null;
  }
  return resolveAuthoritativeIssCanonicalPosition({
    preparedTracks: attachment.getPreparedTracks(ISS_ORBITAL_TRACK_SOURCE_ID),
    lifecycleState: attachment.getLifecycleState(ISS_ORBITAL_TRACK_SOURCE_ID).state,
    productUtcMs,
  });
}
