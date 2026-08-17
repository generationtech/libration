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
 * DLU-2 shared live HTTP acquisition seam.
 * Reusable in-app fetch helpers for lifecycle adapters: abort, content-type,
 * attribution carry-through, optional fixture fallback, error/stale disposition.
 * Never invoke from requestAnimationFrame, layer constructors, or RenderPlan build.
 * @see docs/specs/scene/dynamic-data-lifecycle-plan.md
 */

import { isValidDynamicSourceId } from "./dynamicSnapshotContracts";
import type {
  DynamicAcquisitionResult,
  DynamicSnapshotAcquisitionAdapter,
} from "./dynamicAcquisitionTypes";
import type { DynamicDataLifecycleManager } from "./dynamicLifecycleTypes";
import type { DynamicSnapshotStoreEntry } from "./dynamicSnapshotStoreTypes";
import type { DynamicSourceId } from "./dynamicSnapshotTypes";
import type {
  ApplyAcquisitionAttributionInput,
  LiveAcquireFailureDisposition,
  LiveAcquireFailurePolicy,
  LiveHttpAcquisitionAdapterOptions,
  LiveHttpAttribution,
  LiveHttpFetchFn,
  LiveHttpFetchOptions,
  LiveHttpFetchResult,
} from "./liveHttpAcquisitionTypes";

/**
 * Strip Content-Type parameters (`charset`, etc.) and lowercase.
 */
export function normalizeHttpContentType(
  header: string | null | undefined,
): string {
  if (typeof header !== "string") return "";
  const mime = header.split(";")[0]?.trim().toLowerCase() ?? "";
  return mime;
}

/**
 * True when the response Content-Type matches one of the accepted MIME types
 * (parameter-stripped, case-insensitive exact match).
 */
export function contentTypeMatchesAccept(
  responseContentType: string | null | undefined,
  acceptContentTypes: readonly string[],
): boolean {
  const actual = normalizeHttpContentType(responseContentType);
  if (actual.length === 0) return false;
  for (const accept of acceptContentTypes) {
    if (typeof accept !== "string") continue;
    const want = accept.trim().toLowerCase();
    if (want.length === 0) continue;
    if (actual === want) return true;
  }
  return false;
}

function defaultFetchFn(): LiveHttpFetchFn {
  if (typeof globalThis.fetch !== "function") {
    throw new Error("fetch is not available in this environment");
  }
  return globalThis.fetch.bind(globalThis) as LiveHttpFetchFn;
}

type TimeoutLink = Readonly<{
  signal?: AbortSignal;
  cancel: () => void;
  didTimeout: () => boolean;
}>;

/**
 * Bound a parent AbortSignal with an optional timeout. Timeout abort is
 * distinct from parent abort so callers can fail over instead of treating
 * disable/stop as a timeout.
 */
function linkTimeoutSignal(
  parent: AbortSignal | undefined,
  timeoutMs: number | undefined,
): TimeoutLink {
  if (
    timeoutMs === undefined ||
    !Number.isFinite(timeoutMs) ||
    timeoutMs <= 0
  ) {
    return {
      signal: parent,
      cancel: () => undefined,
      didTimeout: () => false,
    };
  }
  const timeout = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    timeout.abort();
  }, timeoutMs);
  const onParentAbort = () => {
    clearTimeout(timer);
    timeout.abort();
  };
  if (parent !== undefined) {
    if (parent.aborted) {
      clearTimeout(timer);
      timeout.abort();
    } else {
      parent.addEventListener("abort", onParentAbort, { once: true });
    }
  }
  const signal =
    parent !== undefined && typeof AbortSignal.any === "function"
      ? AbortSignal.any([parent, timeout.signal])
      : timeout.signal;
  return {
    signal,
    cancel: () => {
      clearTimeout(timer);
      if (parent !== undefined) {
        parent.removeEventListener("abort", onParentAbort);
      }
    },
    didTimeout: () => timedOut && parent?.aborted !== true,
  };
}

/**
 * Fetch bytes for a live acquisition adapter.
 * Honors AbortSignal; rejects unexpected Content-Type; does not parse product
 * payloads (callers map bytes → store entries).
 */
export async function fetchLiveHttpBytes(
  options: LiveHttpFetchOptions,
): Promise<LiveHttpFetchResult> {
  const url = typeof options.url === "string" ? options.url.trim() : "";
  if (url.length === 0) {
    return { ok: false, error: "url required" };
  }
  if (
    !Array.isArray(options.acceptContentTypes) ||
    options.acceptContentTypes.length === 0
  ) {
    return { ok: false, error: "acceptContentTypes required" };
  }

  const parentSignal = options.signal;
  if (parentSignal?.aborted) {
    return { ok: false, error: "aborted", aborted: true };
  }

  const timeoutLink = linkTimeoutSignal(parentSignal, options.timeoutMs);
  const signal = timeoutLink.signal;

  const fetchFn = options.fetchFn ?? defaultFetchFn();
  const headers: Record<string, string> = {
    Accept: options.acceptContentTypes.join(", "),
    ...(options.headers ?? {}),
  };

  let response: Response;
  try {
    response = await fetchFn(url, { signal, headers });
  } catch (err) {
    timeoutLink.cancel();
    if (parentSignal?.aborted) {
      return { ok: false, error: "aborted", aborted: true };
    }
    if (timeoutLink.didTimeout()) {
      return { ok: false, error: "timeout" };
    }
    const message =
      err instanceof Error && err.message.trim().length > 0
        ? err.message.trim()
        : "network request failed";
    return { ok: false, error: message };
  }

  if (parentSignal?.aborted) {
    timeoutLink.cancel();
    return { ok: false, error: "aborted", aborted: true };
  }
  if (timeoutLink.didTimeout()) {
    timeoutLink.cancel();
    return { ok: false, error: "timeout" };
  }

  if (!response.ok) {
    timeoutLink.cancel();
    return {
      ok: false,
      error: `HTTP ${response.status}`,
      status: response.status,
    };
  }

  const rawType = response.headers.get("content-type");
  if (!contentTypeMatchesAccept(rawType, options.acceptContentTypes)) {
    timeoutLink.cancel();
    const got = normalizeHttpContentType(rawType) || "(missing)";
    return {
      ok: false,
      error: `unexpected content-type: ${got}`,
      status: response.status,
    };
  }

  let buffer: ArrayBuffer;
  try {
    buffer = await response.arrayBuffer();
  } catch (err) {
    timeoutLink.cancel();
    if (parentSignal?.aborted) {
      return { ok: false, error: "aborted", aborted: true };
    }
    if (timeoutLink.didTimeout()) {
      return { ok: false, error: "timeout" };
    }
    const message =
      err instanceof Error && err.message.trim().length > 0
        ? err.message.trim()
        : "failed to read response body";
    return { ok: false, error: message };
  }

  timeoutLink.cancel();
  if (parentSignal?.aborted) {
    return { ok: false, error: "aborted", aborted: true };
  }

  return {
    ok: true,
    bytes: new Uint8Array(buffer),
    contentType: normalizeHttpContentType(rawType),
    responseUrl: typeof response.url === "string" && response.url.length > 0
      ? response.url
      : url,
    status: response.status,
  };
}

/**
 * Stamp attribution / license onto a store entry when the meta fields are empty.
 * Does not overwrite non-empty meta attribution already set by the producer.
 */
export function applyAcquisitionAttribution(
  input: ApplyAcquisitionAttributionInput,
): DynamicSnapshotStoreEntry {
  const { entry, attribution } = input;
  if (attribution === undefined) return entry;

  const nextAttribution = pickAttributionField(
    entry.record.meta.attribution,
    attribution.attribution,
  );
  const nextLicense = pickAttributionField(
    entry.record.meta.licenseNote,
    attribution.licenseNote,
  );

  if (
    nextAttribution === entry.record.meta.attribution &&
    nextLicense === entry.record.meta.licenseNote
  ) {
    return entry;
  }

  return {
    record: {
      meta: {
        ...entry.record.meta,
        ...(nextAttribution !== undefined
          ? { attribution: nextAttribution }
          : {}),
        ...(nextLicense !== undefined ? { licenseNote: nextLicense } : {}),
      },
      body: entry.record.body,
    },
    ...(entry.payloadBytes !== undefined
      ? { payloadBytes: entry.payloadBytes }
      : {}),
  };
}

function pickAttributionField(
  existing: string | undefined,
  incoming: string | undefined,
): string | undefined {
  if (typeof existing === "string" && existing.trim().length > 0) {
    return existing;
  }
  if (typeof incoming === "string") {
    const trimmed = incoming.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return existing;
}

/**
 * Resolve whether a live-acquire failure should surface as lifecycle `error`
 * or `stale` when a prior version remains usable.
 */
export function resolveLiveAcquireFailureDisposition(options: {
  hasUsableCachedVersion: boolean;
  policy?: LiveAcquireFailurePolicy;
}): LiveAcquireFailureDisposition {
  const policy = options.policy ?? "stale-when-cached";
  if (policy === "stale-when-cached" && options.hasUsableCachedVersion) {
    return "stale";
  }
  return "error";
}

/**
 * Apply live-acquire failure to the lifecycle manager (error or stale).
 * Abort failures should not call this — controllers recover separately.
 *
 * When disposition is `stale` and the source is still `loading` (normal during
 * refresh), restores `ready` with the prior version first — `loading → stale`
 * is not a valid manager transition.
 */
export function applyLiveAcquireFailureToLifecycle(
  lifecycle: DynamicDataLifecycleManager,
  sourceId: DynamicSourceId,
  error: string,
  disposition: LiveAcquireFailureDisposition,
): void {
  if (disposition === "stale") {
    const snap = lifecycle.getState(sourceId);
    if (snap.state === "loading" && snap.latestVersionId !== undefined) {
      lifecycle.markReady(sourceId, {
        latestVersionId: snap.latestVersionId,
      });
    }
    const afterReady = lifecycle.getState(sourceId);
    if (afterReady.state === "ready" || afterReady.state === "stale") {
      lifecycle.markStale(sourceId);
      return;
    }
    // Cannot reach stale from this state — fall through to error.
  }
  lifecycle.markError(sourceId, error);
}

function withAttributionResult(
  result: DynamicAcquisitionResult,
  attribution: LiveHttpAttribution | undefined,
): DynamicAcquisitionResult {
  if (!result.ok || attribution === undefined) return result;
  return {
    ok: true,
    entry: applyAcquisitionAttribution({ entry: result.entry, attribution }),
  };
}

/**
 * Build a lifecycle acquisition adapter that fetches over HTTP (or an injectable
 * fetch equivalent), maps bytes via `toEntry`, optionally falls back to a fixture
 * producer, and carries attribution onto live entries.
 *
 * Register with {@link createDynamicAcquisitionController} outside the paint path.
 * Does **not** swap production feeds for shipped consumers by itself — DLU-3+.
 */
export function createLiveHttpAcquisitionAdapter(
  options: LiveHttpAcquisitionAdapterOptions,
): DynamicSnapshotAcquisitionAdapter {
  if (!isValidDynamicSourceId(options.sourceId)) {
    throw new Error("invalid sourceId");
  }
  const url = typeof options.url === "string" ? options.url.trim() : "";
  if (url.length === 0) {
    throw new Error("url required");
  }
  if (
    !Array.isArray(options.acceptContentTypes) ||
    options.acceptContentTypes.length === 0
  ) {
    throw new Error("acceptContentTypes required");
  }

  const attribution = options.attribution;
  const fixtureFallback = options.fixtureFallback;
  const fetchFn = options.fetchFn;
  const headers = options.headers;
  const acceptContentTypes = options.acceptContentTypes;
  const toEntry = options.toEntry;
  const sourceId = options.sourceId;
  const timeoutMs = options.timeoutMs;

  return {
    sourceId,
    async acquire(signal?: AbortSignal): Promise<DynamicAcquisitionResult> {
      if (signal?.aborted) {
        return { ok: false, error: "aborted" };
      }

      const fetched = await fetchLiveHttpBytes({
        url,
        acceptContentTypes,
        signal,
        ...(fetchFn !== undefined ? { fetchFn } : {}),
        ...(headers !== undefined ? { headers } : {}),
        ...(timeoutMs !== undefined ? { timeoutMs } : {}),
      });

      if (fetched.ok) {
        const mapped = await toEntry(fetched, signal);
        return withAttributionResult(mapped, attribution);
      }

      if (fetched.aborted || signal?.aborted) {
        return { ok: false, error: "aborted" };
      }

      if (fixtureFallback !== undefined) {
        const fallback = await fixtureFallback(signal);
        if (fallback.ok) {
          return fallback;
        }
        const liveMsg =
          fetched.error.trim().length > 0 ? fetched.error.trim() : "live fetch failed";
        const fallbackMsg =
          fallback.error.trim().length > 0
            ? fallback.error.trim()
            : "fixture fallback failed";
        return {
          ok: false,
          error: `${liveMsg}; fixture fallback: ${fallbackMsg}`,
        };
      }

      return {
        ok: false,
        error:
          fetched.error.trim().length > 0
            ? fetched.error.trim()
            : "live fetch failed",
      };
    },
  };
}
