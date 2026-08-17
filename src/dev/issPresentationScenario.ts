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
 * DEV-only ISS presentation visual fixture. Production never imports this module.
 * Uses a recorded TLE + in-process SGP4 at a documented UTC so Space objects
 * controls can be exercised without CelesTrak. Not a production live fallback.
 */

import type { PreparedTracksView } from "../lifecycle/dynamicTracksMaterializer";
import { produceIssOrbitalTrackLiveAcquisitionFromFetched } from "../lifecycle/issOrbitalTrackAcquisition";

/** Product UTC aligned to the recorded TLE epoch so freshness paints as live. */
export const ISS_PRESENTATION_SCENARIO_UTC = "2026-08-06T01:17:00.000Z";

const ISS_PRESENTATION_SCENARIO_TLE_3LE = [
  "ISS (ZARYA)",
  "1 25544U 98067A   26218.05391056  .00003997  00000+0  79690-4 0  9990",
  "2 25544  51.6321  53.3065 0007216  17.1615 342.9616 15.49359774579487",
].join("\n");

export function buildIssPresentationPreparedTracksView(): PreparedTracksView {
  const productUtcMs = Date.parse(ISS_PRESENTATION_SCENARIO_UTC);
  const result = produceIssOrbitalTrackLiveAcquisitionFromFetched(
    {
      ok: true,
      bytes: new TextEncoder().encode(ISS_PRESENTATION_SCENARIO_TLE_3LE),
      contentType: "text/plain",
      responseUrl: "dev://iss-presentation-scenario",
      status: 200,
    },
    {
      nowMs: () => productUtcMs,
      versionIdFor: () => "iss-presentation-dev",
    },
  );
  if (!result.ok) {
    throw new Error("iss-presentation scenario: failed to build prepared ISS tracks");
  }
  const body = result.entry.record.body;
  if (body.kind !== "tracks") {
    throw new Error("iss-presentation scenario: expected tracks body");
  }
  const meta = result.entry.record.meta;
  return {
    sourceId: meta.sourceId,
    versionId: meta.versionId,
    tracks: body.tracks,
    validTimeMs: meta.validTimeMs,
    freshness: "ready",
    ...(meta.attribution !== undefined ? { attribution: meta.attribution } : {}),
    ...(meta.licenseNote !== undefined ? { licenseNote: meta.licenseNote } : {}),
  };
}
