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
 * DLU-2 shared live HTTP acquisition seam — contracts.
 * In-app fetch helpers for lifecycle adapters; never used from rAF / RenderPlan.
 * @see docs/specs/scene/dynamic-data-lifecycle-plan.md
 */

import type { DynamicAcquisitionResult } from "./dynamicAcquisitionTypes";
import type { DynamicSnapshotStoreEntry } from "./dynamicSnapshotStoreTypes";
import type { DynamicSourceId } from "./dynamicSnapshotTypes";

/** Successful live HTTP body read (bytes + response metadata). */
export type LiveHttpFetchOk = Readonly<{
  ok: true;
  bytes: Uint8Array;
  /** Normalized MIME (no parameters), e.g. `application/json`. */
  contentType: string;
  /** Final response URL after redirects when available. */
  responseUrl: string;
  status: number;
}>;

/** Failed live HTTP body read. */
export type LiveHttpFetchFail = Readonly<{
  ok: false;
  error: string;
  /** True when the caller AbortSignal cancelled the request. */
  aborted?: true;
  status?: number;
}>;

export type LiveHttpFetchResult = LiveHttpFetchOk | LiveHttpFetchFail;

/**
 * Injectable `fetch` for tests / desktop equivalents.
 * Must honor `signal` the same way as the Fetch API.
 */
export type LiveHttpFetchFn = (
  input: string,
  init?: { signal?: AbortSignal; headers?: Record<string, string> },
) => Promise<Response>;

export type LiveHttpFetchOptions = Readonly<{
  url: string;
  /** Acceptable Content-Type values (matched after stripping parameters). */
  acceptContentTypes: readonly string[];
  signal?: AbortSignal;
  /**
   * Optional bound for this request only. When elapsed, the fetch is aborted
   * and the result is `{ ok: false, error: "timeout" }` (not `aborted`), so a
   * caller can fail over. Parent `signal` abort still returns `aborted`.
   */
  timeoutMs?: number;
  /** Override global `fetch` (tests / Tauri bridge later). */
  fetchFn?: LiveHttpFetchFn;
  headers?: Readonly<Record<string, string>>;
}>;

/**
 * How a failed live acquire should affect the lifecycle manager when a prior
 * version remains in cache.
 *
 * - `error` — surface hard failure (`markError`).
 * - `stale` — keep usable cache visible (`markStale`); refresh failed.
 */
export type LiveAcquireFailureDisposition = "error" | "stale";

export type LiveAcquireFailurePolicy = "error" | "stale-when-cached";

export type LiveHttpAttribution = Readonly<{
  attribution?: string;
  licenseNote?: string;
}>;

/**
 * Convert a successful HTTP body into a store-ready acquisition result.
 * Called only from acquisition adapters (outside paint).
 */
export type LiveHttpBytesToEntry = (
  fetched: LiveHttpFetchOk,
  signal?: AbortSignal,
) => DynamicAcquisitionResult | Promise<DynamicAcquisitionResult>;

export type LiveHttpAcquisitionAdapterOptions = Readonly<{
  sourceId: DynamicSourceId;
  url: string;
  acceptContentTypes: readonly string[];
  /** Map raw HTTP bytes → store entry (kind-specific parsing). */
  toEntry: LiveHttpBytesToEntry;
  /**
   * Attribution stamped onto successful live entries when meta lacks them
   * (catalog / feed credit carry-through).
   */
  attribution?: LiveHttpAttribution;
  /**
   * When live HTTP fails (non-abort), optionally produce a fixture / offline
   * entry under the same durable `sourceId`.
   */
  fixtureFallback?: (
    signal?: AbortSignal,
  ) => DynamicAcquisitionResult | Promise<DynamicAcquisitionResult>;
  fetchFn?: LiveHttpFetchFn;
  headers?: Readonly<Record<string, string>>;
  /** Optional per-request timeout forwarded to {@link fetchLiveHttpBytes}. */
  timeoutMs?: number;
}>;

export type ApplyAcquisitionAttributionInput = Readonly<{
  entry: DynamicSnapshotStoreEntry;
  attribution?: LiveHttpAttribution;
}>;
