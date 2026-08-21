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
 * Pure helpers for Phase 10 dynamic snapshot contracts.
 * No network, no persistence, no RenderPlan / layer coupling.
 * @see docs/specs/scene/dynamic-data-lifecycle-plan.md
 */

import {
  DYNAMIC_SNAPSHOT_FRESHNESS_VALUES,
  DYNAMIC_SNAPSHOT_KINDS,
  type DynamicSnapshotBody,
  type DynamicSnapshotFreshness,
  type DynamicSnapshotKind,
  type DynamicSnapshotRecord,
  type DynamicSnapshotTemporalMeta,
  type DynamicSnapshotVersionId,
  type DynamicSourceId,
} from "./dynamicSnapshotTypes";

/** Lowercase kebab semantic ids: `goes-east-ir-v1`. Rejects URLs and empty strings. */
const DYNAMIC_SOURCE_ID_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export function isDynamicSnapshotKind(
  value: unknown,
): value is DynamicSnapshotKind {
  return (
    typeof value === "string" &&
    (DYNAMIC_SNAPSHOT_KINDS as readonly string[]).includes(value)
  );
}

export function isDynamicSnapshotFreshness(
  value: unknown,
): value is DynamicSnapshotFreshness {
  return (
    typeof value === "string" &&
    (DYNAMIC_SNAPSHOT_FRESHNESS_VALUES as readonly string[]).includes(value)
  );
}

/**
 * Durable source ids are semantic tokens, never fetch URLs.
 * Returns false for empty, whitespace, uppercase, or scheme-bearing strings.
 */
export function isValidDynamicSourceId(
  value: unknown,
): value is DynamicSourceId {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed !== value) return false;
  if (trimmed.length === 0 || trimmed.length > 128) return false;
  if (/:\/\//.test(trimmed) || /^[a-z]+:/i.test(trimmed)) return false;
  return DYNAMIC_SOURCE_ID_RE.test(trimmed);
}

/**
 * Trims and lowercases a candidate id. Returns null when the result is invalid.
 */
export function normalizeDynamicSourceId(
  value: unknown,
): DynamicSourceId | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return isValidDynamicSourceId(normalized) ? normalized : null;
}

export function isValidDynamicSnapshotVersionId(
  value: unknown,
): value is DynamicSnapshotVersionId {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed !== value) return false;
  if (trimmed.length === 0 || trimmed.length > 256) return false;
  // Opaque token: allow content hashes and dotted forms; reject URLs / path separators.
  if (/:\/\//.test(trimmed) || /[\\/]/.test(trimmed)) return false;
  return true;
}

function isFiniteEpochMs(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Validates and normalizes temporal metadata from unknown input.
 * Drops optional fields that are empty/invalid rather than failing the whole meta.
 */
export function parseDynamicSnapshotTemporalMeta(
  input: unknown,
): DynamicSnapshotTemporalMeta | null {
  if (!isPlainObject(input)) return null;

  const sourceId = normalizeDynamicSourceId(input.sourceId);
  if (sourceId === null) return null;
  if (!isDynamicSnapshotKind(input.kind)) return null;
  if (!isValidDynamicSnapshotVersionId(input.versionId)) return null;
  if (!isFiniteEpochMs(input.acquiredAtMs)) return null;
  if (!isFiniteEpochMs(input.validTimeMs)) return null;

  const meta: {
    sourceId: DynamicSourceId;
    kind: DynamicSnapshotKind;
    versionId: DynamicSnapshotVersionId;
    acquiredAtMs: number;
    validTimeMs: number;
    validUntilMs?: number;
    attribution?: string;
    licenseNote?: string;
    origin?: "live" | "fixture";
  } = {
    sourceId,
    kind: input.kind,
    versionId: input.versionId,
    acquiredAtMs: input.acquiredAtMs,
    validTimeMs: input.validTimeMs,
  };

  if (input.validUntilMs !== undefined) {
    if (!isFiniteEpochMs(input.validUntilMs)) return null;
    if (input.validUntilMs < input.validTimeMs) return null;
    meta.validUntilMs = input.validUntilMs;
  }

  if (typeof input.attribution === "string") {
    const attribution = input.attribution.trim();
    if (attribution.length > 0) meta.attribution = attribution;
  }

  if (typeof input.licenseNote === "string") {
    const licenseNote = input.licenseNote.trim();
    if (licenseNote.length > 0) meta.licenseNote = licenseNote;
  }

  if (input.origin === "live" || input.origin === "fixture") {
    meta.origin = input.origin;
  }

  return meta;
}

/**
 * True when `productInstantMs` falls in this snapshot's validity window.
 * Without `validUntilMs`, only an exact `validTimeMs` match is "in window"
 * (nearest-distance selection still considers all candidates).
 */
export function snapshotCoversProductInstant(
  meta: Pick<DynamicSnapshotTemporalMeta, "validTimeMs" | "validUntilMs">,
  productInstantMs: number,
): boolean {
  if (!Number.isFinite(productInstantMs)) return false;
  if (meta.validUntilMs === undefined) {
    return productInstantMs === meta.validTimeMs;
  }
  return (
    productInstantMs >= meta.validTimeMs &&
    productInstantMs <= meta.validUntilMs
  );
}

/** Absolute distance from product instant to snapshot valid time. */
export function validTimeDistanceMs(
  meta: Pick<DynamicSnapshotTemporalMeta, "validTimeMs">,
  productInstantMs: number,
): number {
  return Math.abs(meta.validTimeMs - productInstantMs);
}

function compareNearestCandidates(
  a: DynamicSnapshotTemporalMeta,
  b: DynamicSnapshotTemporalMeta,
  productInstantMs: number,
): number {
  const distA = validTimeDistanceMs(a, productInstantMs);
  const distB = validTimeDistanceMs(b, productInstantMs);
  if (distA !== distB) return distA - distB;
  // Prefer later valid time, then later acquisition, then stable version id.
  if (a.validTimeMs !== b.validTimeMs) return b.validTimeMs - a.validTimeMs;
  if (a.acquiredAtMs !== b.acquiredAtMs) return b.acquiredAtMs - a.acquiredAtMs;
  return a.versionId < b.versionId ? -1 : a.versionId > b.versionId ? 1 : 0;
}

/**
 * Default Phase 10 product-time selection policy (pure; wired by P10-4 resolver):
 * 1. If any candidates cover `productInstantMs` via `validUntilMs` window (or exact
 *    `validTimeMs` when no until), prefer among those by nearest `validTimeMs`.
 * 2. Otherwise pick nearest `validTimeMs` among all candidates for the same `sourceId`
 *    filter (caller scopes the list).
 *
 * Does not fetch. Empty input → null.
 */
export function selectNearestSnapshotMetaByValidTime(
  candidates: readonly DynamicSnapshotTemporalMeta[],
  productInstantMs: number,
): DynamicSnapshotTemporalMeta | null {
  if (!Number.isFinite(productInstantMs) || candidates.length === 0) {
    return null;
  }

  const covering = candidates.filter((m) =>
    snapshotCoversProductInstant(m, productInstantMs),
  );
  const pool = covering.length > 0 ? covering : candidates;

  let best: DynamicSnapshotTemporalMeta | null = null;
  for (const meta of pool) {
    if (best === null || compareNearestCandidates(meta, best, productInstantMs) < 0) {
      best = meta;
    }
  }
  return best;
}

/**
 * Ensures body discriminant matches temporal meta kind.
 * Returns a typed record or null when kinds disagree / meta invalid.
 */
export function buildDynamicSnapshotRecord(
  metaInput: unknown,
  body: DynamicSnapshotBody,
): DynamicSnapshotRecord | null {
  const meta = parseDynamicSnapshotTemporalMeta(metaInput);
  if (meta === null) return null;
  if (meta.kind !== body.kind) return null;
  return { meta, body };
}
