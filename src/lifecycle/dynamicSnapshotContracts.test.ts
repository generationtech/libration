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

import { describe, expect, it } from "vitest";
import {
  DYNAMIC_SNAPSHOT_FRESHNESS_VALUES,
  DYNAMIC_SNAPSHOT_KINDS,
  buildDynamicSnapshotRecord,
  isDynamicSnapshotFreshness,
  isDynamicSnapshotKind,
  isValidDynamicSnapshotVersionId,
  isValidDynamicSourceId,
  normalizeDynamicSourceId,
  parseDynamicSnapshotTemporalMeta,
  selectNearestSnapshotMetaByValidTime,
  snapshotCoversProductInstant,
  validTimeDistanceMs,
  type DynamicSnapshotTemporalMeta,
} from "./index";

const BASE_META: DynamicSnapshotTemporalMeta = {
  sourceId: "fixture-clouds-ir-v1",
  kind: "equirectRaster",
  versionId: "v-2026-08-05T12",
  acquiredAtMs: 1_700_000_000_000,
  validTimeMs: 1_700_000_100_000,
};

describe("dynamic snapshot kind / freshness enums", () => {
  it("exposes all three Phase 10 snapshot kinds", () => {
    expect([...DYNAMIC_SNAPSHOT_KINDS]).toEqual([
      "equirectRaster",
      "pointFeatures",
      "tracks",
    ]);
    expect(isDynamicSnapshotKind("equirectRaster")).toBe(true);
    expect(isDynamicSnapshotKind("pointFeatures")).toBe(true);
    expect(isDynamicSnapshotKind("tracks")).toBe(true);
    expect(isDynamicSnapshotKind("weather")).toBe(false);
    expect(isDynamicSnapshotKind(null)).toBe(false);
  });

  it("exposes freshness values for future UI / resolver status", () => {
    expect([...DYNAMIC_SNAPSHOT_FRESHNESS_VALUES]).toEqual([
      "loading",
      "ready",
      "stale",
      "error",
      "missing",
    ]);
    expect(isDynamicSnapshotFreshness("ready")).toBe(true);
    expect(isDynamicSnapshotFreshness("unknown")).toBe(false);
  });
});

describe("dynamic source id", () => {
  it("accepts durable kebab semantic ids", () => {
    expect(isValidDynamicSourceId("goes-east-ir-v1")).toBe(true);
    expect(isValidDynamicSourceId("usgs-earthquakes-feed-v1")).toBe(true);
    expect(normalizeDynamicSourceId("  Goes-East-IR-V1  ")).toBe(
      "goes-east-ir-v1",
    );
  });

  it("rejects URLs, empty, and invalid shapes", () => {
    expect(isValidDynamicSourceId("https://cdn.example/cloud.png")).toBe(false);
    expect(isValidDynamicSourceId("http://x")).toBe(false);
    expect(isValidDynamicSourceId("")).toBe(false);
    expect(isValidDynamicSourceId(" Goes-East ")).toBe(false);
    expect(isValidDynamicSourceId("UPPER")).toBe(false);
    expect(isValidDynamicSourceId("-leading")).toBe(false);
    expect(normalizeDynamicSourceId("https://cdn.example/x")).toBeNull();
  });

  it("rejects path-like or URL version ids", () => {
    expect(isValidDynamicSnapshotVersionId("abc123")).toBe(true);
    expect(isValidDynamicSnapshotVersionId("sha256:deadbeef")).toBe(true);
    expect(isValidDynamicSnapshotVersionId("https://x")).toBe(false);
    expect(isValidDynamicSnapshotVersionId("a/b")).toBe(false);
    expect(isValidDynamicSnapshotVersionId("")).toBe(false);
  });
});

describe("parseDynamicSnapshotTemporalMeta", () => {
  it("parses required temporal fields for all kinds", () => {
    for (const kind of DYNAMIC_SNAPSHOT_KINDS) {
      const meta = parseDynamicSnapshotTemporalMeta({
        ...BASE_META,
        kind,
      });
      expect(meta).toEqual({ ...BASE_META, kind });
    }
  });

  it("accepts optional coverage window and attribution", () => {
    const meta = parseDynamicSnapshotTemporalMeta({
      ...BASE_META,
      validUntilMs: BASE_META.validTimeMs + 3_600_000,
      attribution: "  NOAA / NESDIS  ",
      licenseNote: " public domain ",
    });
    expect(meta).toEqual({
      ...BASE_META,
      validUntilMs: BASE_META.validTimeMs + 3_600_000,
      attribution: "NOAA / NESDIS",
      licenseNote: "public domain",
    });
  });

  it("rejects inverted coverage windows and bad ids", () => {
    expect(
      parseDynamicSnapshotTemporalMeta({
        ...BASE_META,
        validUntilMs: BASE_META.validTimeMs - 1,
      }),
    ).toBeNull();
    expect(
      parseDynamicSnapshotTemporalMeta({
        ...BASE_META,
        sourceId: "https://example.com/feed",
      }),
    ).toBeNull();
    expect(
      parseDynamicSnapshotTemporalMeta({
        ...BASE_META,
        kind: "cloudLayer",
      }),
    ).toBeNull();
  });
});

describe("product-time coverage and nearest selection", () => {
  it("covers exact validTime when no validUntilMs", () => {
    expect(snapshotCoversProductInstant(BASE_META, BASE_META.validTimeMs)).toBe(
      true,
    );
    expect(
      snapshotCoversProductInstant(BASE_META, BASE_META.validTimeMs + 1),
    ).toBe(false);
  });

  it("covers inclusive [validTimeMs, validUntilMs] windows", () => {
    const windowed = {
      ...BASE_META,
      validUntilMs: BASE_META.validTimeMs + 1000,
    };
    expect(snapshotCoversProductInstant(windowed, BASE_META.validTimeMs)).toBe(
      true,
    );
    expect(
      snapshotCoversProductInstant(windowed, BASE_META.validTimeMs + 500),
    ).toBe(true);
    expect(
      snapshotCoversProductInstant(windowed, BASE_META.validTimeMs + 1000),
    ).toBe(true);
    expect(
      snapshotCoversProductInstant(windowed, BASE_META.validTimeMs + 1001),
    ).toBe(false);
  });

  it("reports absolute valid-time distance", () => {
    expect(validTimeDistanceMs(BASE_META, BASE_META.validTimeMs + 40)).toBe(40);
    expect(validTimeDistanceMs(BASE_META, BASE_META.validTimeMs - 7)).toBe(7);
  });

  it("selects nearest validTime among non-covering candidates", () => {
    const earlier = {
      ...BASE_META,
      versionId: "earlier",
      validTimeMs: 1_000,
      acquiredAtMs: 10,
    };
    const later = {
      ...BASE_META,
      versionId: "later",
      validTimeMs: 3_000,
      acquiredAtMs: 20,
    };
    const picked = selectNearestSnapshotMetaByValidTime(
      [earlier, later],
      2_400,
    );
    expect(picked?.versionId).toBe("later");
  });

  it("prefers covering-window candidates over nearer uncovered ones", () => {
    const uncoveredNear = {
      ...BASE_META,
      versionId: "near-point",
      validTimeMs: 2_000,
    };
    const coveringFar = {
      ...BASE_META,
      versionId: "cover-far",
      validTimeMs: 0,
      validUntilMs: 10_000,
    };
    const picked = selectNearestSnapshotMetaByValidTime(
      [uncoveredNear, coveringFar],
      5_000,
    );
    expect(picked?.versionId).toBe("cover-far");
  });

  it("returns null for empty candidate lists or non-finite product time", () => {
    expect(selectNearestSnapshotMetaByValidTime([], 0)).toBeNull();
    expect(
      selectNearestSnapshotMetaByValidTime([BASE_META], Number.NaN),
    ).toBeNull();
  });

  it("tie-breaks by later validTime, then acquiredAt, then versionId", () => {
    const a = {
      ...BASE_META,
      versionId: "a",
      validTimeMs: 100,
      acquiredAtMs: 1,
    };
    const b = {
      ...BASE_META,
      versionId: "b",
      validTimeMs: 100,
      acquiredAtMs: 2,
    };
    expect(
      selectNearestSnapshotMetaByValidTime([a, b], 100)?.versionId,
    ).toBe("b");
  });
});

describe("buildDynamicSnapshotRecord", () => {
  it("builds records when meta kind matches body kind", () => {
    const raster = buildDynamicSnapshotRecord(BASE_META, {
      kind: "equirectRaster",
      contentType: "image/jpeg",
      lonMinDeg: -180,
      lonMaxDeg: 180,
      byteLength: 12,
    });
    expect(raster?.meta.kind).toBe("equirectRaster");
    expect(raster?.body.kind).toBe("equirectRaster");

    const points = buildDynamicSnapshotRecord(
      { ...BASE_META, kind: "pointFeatures", sourceId: "usgs-quakes-v1" },
      {
        kind: "pointFeatures",
        features: [{ id: "eq-1", lonDeg: -120, latDeg: 35 }],
      },
    );
    expect(points?.body.kind).toBe("pointFeatures");
    if (points?.body.kind === "pointFeatures") {
      expect(points.body.features).toHaveLength(1);
    }

    const tracks = buildDynamicSnapshotRecord(
      { ...BASE_META, kind: "tracks", sourceId: "iss-track-v1" },
      {
        kind: "tracks",
        tracks: [
          {
            id: "iss",
            samples: [{ lonDeg: 10, latDeg: 20, timeMs: BASE_META.validTimeMs }],
          },
        ],
      },
    );
    expect(tracks?.body.kind).toBe("tracks");
  });

  it("rejects kind mismatches without inventing product layers", () => {
    expect(
      buildDynamicSnapshotRecord(BASE_META, {
        kind: "pointFeatures",
        features: [],
      }),
    ).toBeNull();
  });
});
