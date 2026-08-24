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
 * LIB-089 — ISS tracking consumes the same SGP4 current sample the overlay paints.
 */

import { describe, expect, it } from "vitest";
import type { PreparedTracksView } from "./dynamicTracksMaterializer";
import {
  ISS_ORBITAL_TRACK_SOURCE_ID,
  ISS_TLE_DEGRADED_MAX_AGE_MS,
  produceIssOrbitalTrackFixtureAcquisition,
  produceIssOrbitalTrackLiveAcquisitionFromFetched,
  propagateIssPositionAtTime,
  resolveAuthoritativeIssCanonicalPosition,
  type LiveHttpFetchOk,
} from "./index";

const SAMPLE_ISS_TLE_3LE = [
  "ISS (ZARYA)",
  "1 25544U 98067A   26218.05391056  .00003997  00000+0  79690-4 0  9990",
  "2 25544  51.6321  53.3065 0007216  17.1615 342.9616 15.49359774579487",
].join("\n");

const TLE = {
  name: "ISS (ZARYA)",
  line1: "1 25544U 98067A   26218.05391056  .00003997  00000+0  79690-4 0  9990",
  line2: "2 25544  51.6321  53.3065 0007216  17.1615 342.9616 15.49359774579487",
};

const CENTER_MS = Date.UTC(2026, 7, 6, 1, 17, 0);

function livePreparedView(nowMs: number): PreparedTracksView {
  const fetched: LiveHttpFetchOk = {
    ok: true,
    status: 200,
    bytes: new TextEncoder().encode(SAMPLE_ISS_TLE_3LE),
    contentType: "text/plain",
    responseUrl: "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE",
  };
  const result = produceIssOrbitalTrackLiveAcquisitionFromFetched(fetched, {
    nowMs: () => nowMs,
    versionIdFor: () => "iss-auth-test",
  });
  if (!result.ok) {
    throw new Error(result.error);
  }
  const body = result.entry.record.body;
  if (body.kind !== "tracks") {
    throw new Error("expected tracks body");
  }
  const meta = result.entry.record.meta;
  return {
    sourceId: meta.sourceId,
    versionId: meta.versionId,
    tracks: body.tracks,
    validTimeMs: meta.validTimeMs,
    freshness: "ready",
  };
}

describe("resolveAuthoritativeIssCanonicalPosition", () => {
  it("resolves the same SGP4 current sample the overlay uses at product UTC", () => {
    const prepared = livePreparedView(CENTER_MS);
    const direct = propagateIssPositionAtTime(TLE, CENTER_MS);
    expect(direct.ok).toBe(true);
    if (!direct.ok) return;
    const resolved = resolveAuthoritativeIssCanonicalPosition({
      preparedTracks: prepared,
      lifecycleState: "ready",
      productUtcMs: CENTER_MS,
    });
    expect(resolved).not.toBeNull();
    expect(resolved!.lonDeg).toBeCloseTo(direct.sample.lonDeg, 8);
    expect(resolved!.latDeg).toBeCloseTo(direct.sample.latDeg, 8);
    expect(prepared.sourceId).toBe(ISS_ORBITAL_TRACK_SOURCE_ID);
  });

  it("returns null when no prepared view exists", () => {
    expect(
      resolveAuthoritativeIssCanonicalPosition({
        preparedTracks: null,
        lifecycleState: "idle",
        productUtcMs: CENTER_MS,
      }),
    ).toBeNull();
  });

  it("returns null for fixture origin, which the overlay also refuses to paint", () => {
    const fixture = produceIssOrbitalTrackFixtureAcquisition({ nowMs: () => CENTER_MS });
    expect(fixture.ok).toBe(true);
    if (!fixture.ok) return;
    const body = fixture.entry.record.body;
    expect(body.kind).toBe("tracks");
    if (body.kind !== "tracks") return;
    const meta = fixture.entry.record.meta;
    const prepared: PreparedTracksView = {
      sourceId: meta.sourceId,
      versionId: meta.versionId,
      tracks: body.tracks,
      validTimeMs: meta.validTimeMs,
      freshness: "ready",
    };
    expect(
      resolveAuthoritativeIssCanonicalPosition({
        preparedTracks: prepared,
        lifecycleState: "ready",
        productUtcMs: CENTER_MS,
      }),
    ).toBeNull();
  });

  it("returns null when the TLE is excessively stale relative to product UTC", () => {
    const prepared = livePreparedView(CENTER_MS);
    const staleMs = CENTER_MS + ISS_TLE_DEGRADED_MAX_AGE_MS + 60_000;
    expect(
      resolveAuthoritativeIssCanonicalPosition({
        preparedTracks: prepared,
        lifecycleState: "ready",
        productUtcMs: staleMs,
      }),
    ).toBeNull();
  });

  it("still resolves a degraded-but-paintable TLE using that same position", () => {
    const prepared = livePreparedView(CENTER_MS);
    const degradedMs = CENTER_MS + 24 * 60 * 60 * 1000;
    const direct = propagateIssPositionAtTime(TLE, degradedMs);
    expect(direct.ok).toBe(true);
    if (!direct.ok) return;
    const resolved = resolveAuthoritativeIssCanonicalPosition({
      preparedTracks: prepared,
      lifecycleState: "stale",
      productUtcMs: degradedMs,
    });
    expect(resolved).not.toBeNull();
    expect(resolved!.lonDeg).toBeCloseTo(direct.sample.lonDeg, 8);
    expect(resolved!.latDeg).toBeCloseTo(direct.sample.latDeg, 8);
  });
});
