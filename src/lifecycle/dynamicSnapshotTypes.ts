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
 * Phase 10 dynamic data lifecycle — core snapshot contracts.
 *
 * Types only: no network, no store I/O, no UI.
 * @see docs/specs/scene/dynamic-data-lifecycle-plan.md
 */

/** Durable semantic source id (not a raw CDN URL). Persist this, not fetch paths. */
export type DynamicSourceId = string;

/** Opaque monotonic or content-addressed version token for a snapshot. */
export type DynamicSnapshotVersionId = string;

export const DYNAMIC_SNAPSHOT_KINDS = [
  "equirectRaster",
  "pointFeatures",
  "tracks",
] as const;

export type DynamicSnapshotKind = (typeof DYNAMIC_SNAPSHOT_KINDS)[number];

/**
 * Freshness surfaces for chrome / future UI — not backend policy.
 * Manager (P10-3) owns transitions; resolver (P10-4) reports these.
 */
export const DYNAMIC_SNAPSHOT_FRESHNESS_VALUES = [
  "loading",
  "ready",
  "stale",
  "error",
  "missing",
] as const;

export type DynamicSnapshotFreshness =
  (typeof DYNAMIC_SNAPSHOT_FRESHNESS_VALUES)[number];

/**
 * Shared temporal metadata on every versioned snapshot.
 * Bytes / feature payloads live beside this in the store (P10-2).
 */
export type DynamicSnapshotTemporalMeta = Readonly<{
  sourceId: DynamicSourceId;
  kind: DynamicSnapshotKind;
  versionId: DynamicSnapshotVersionId;
  /** When the app obtained the bytes (epoch ms). */
  acquiredAtMs: number;
  /** Instant the product represents (analysis / valid time). */
  validTimeMs: number;
  /**
   * Optional inclusive end of validity / forecast coverage.
   * When set, product-time window is `[validTimeMs, validUntilMs]`.
   */
  validUntilMs?: number;
  /** Rights / credit text (catalog or sidecar; consumers fill real catalogs). */
  attribution?: string;
  licenseNote?: string;
}>;

/** Equirect raster body metadata (bytes are store-owned from P10-2). */
export type EquirectRasterSnapshotBody = Readonly<{
  kind: "equirectRaster";
  /** MIME hint when known (e.g. `image/jpeg`). */
  contentType?: string;
  /** Prefer −180…+180; document otherwise at the source adapter. */
  lonMinDeg?: number;
  lonMaxDeg?: number;
  latMinDeg?: number;
  latMaxDeg?: number;
  byteLength?: number;
}>;

export type DynamicPointFeature = Readonly<{
  id: string;
  lonDeg: number;
  latDeg: number;
  validTimeMs?: number;
  properties?: Readonly<Record<string, unknown>>;
}>;

export type PointFeaturesSnapshotBody = Readonly<{
  kind: "pointFeatures";
  features: readonly DynamicPointFeature[];
}>;

export type DynamicTrackSample = Readonly<{
  lonDeg: number;
  latDeg: number;
  timeMs: number;
}>;

export type DynamicTrack = Readonly<{
  id: string;
  samples: readonly DynamicTrackSample[];
  properties?: Readonly<Record<string, unknown>>;
}>;

export type TracksSnapshotBody = Readonly<{
  kind: "tracks";
  tracks: readonly DynamicTrack[];
}>;

export type DynamicSnapshotBody =
  | EquirectRasterSnapshotBody
  | PointFeaturesSnapshotBody
  | TracksSnapshotBody;

/** Typed snapshot record: temporal meta + kind-discriminated body. */
export type DynamicSnapshotRecord = Readonly<{
  meta: DynamicSnapshotTemporalMeta;
  body: DynamicSnapshotBody;
}>;

/**
 * Conceptual product-time resolve result.
 * Full resolver ships in P10-4; this shape is the shared contract.
 */
export type DynamicSnapshotResolveResult = Readonly<{
  status: "ok" | "missing" | "error";
  snapshot: DynamicSnapshotRecord | null;
  freshness: DynamicSnapshotFreshness;
}>;
