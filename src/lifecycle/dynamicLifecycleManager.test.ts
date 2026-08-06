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

import { describe, expect, it, vi } from "vitest";
import {
  createDynamicDataLifecycleManager,
  isAllowedLifecycleTransition,
  isDynamicSourceLifecycleState,
  lifecycleStateToFreshness,
} from "./index";

const SOURCE = "fixture-clouds-ir-v1";

describe("lifecycleStateToFreshness", () => {
  it("maps idle to missing and preserves other states", () => {
    expect(lifecycleStateToFreshness("idle")).toBe("missing");
    expect(lifecycleStateToFreshness("loading")).toBe("loading");
    expect(lifecycleStateToFreshness("ready")).toBe("ready");
    expect(lifecycleStateToFreshness("stale")).toBe("stale");
    expect(lifecycleStateToFreshness("error")).toBe("error");
  });
});

describe("isDynamicSourceLifecycleState / isAllowedLifecycleTransition", () => {
  it("recognizes the five manager states", () => {
    expect(isDynamicSourceLifecycleState("idle")).toBe(true);
    expect(isDynamicSourceLifecycleState("loading")).toBe(true);
    expect(isDynamicSourceLifecycleState("missing")).toBe(false);
  });

  it("allows documented edges and rejects illegal ones", () => {
    expect(isAllowedLifecycleTransition("idle", "loading")).toBe(true);
    expect(isAllowedLifecycleTransition("loading", "ready")).toBe(true);
    expect(isAllowedLifecycleTransition("ready", "stale")).toBe(true);
    expect(isAllowedLifecycleTransition("stale", "loading")).toBe(true);
    expect(isAllowedLifecycleTransition("error", "loading")).toBe(true);
    expect(isAllowedLifecycleTransition("idle", "stale")).toBe(false);
    expect(isAllowedLifecycleTransition("error", "ready")).toBe(false);
    expect(isAllowedLifecycleTransition("loading", "stale")).toBe(false);
  });
});

describe("DynamicDataLifecycleManager", () => {
  it("returns synthetic idle for unknown sources without tracking them", () => {
    const mgr = createDynamicDataLifecycleManager();
    expect(mgr.getState(SOURCE)).toEqual({
      sourceId: SOURCE,
      state: "idle",
      revision: 0,
    });
    expect(mgr.listStates()).toEqual([]);
  });

  it("ensureSource creates a tracked idle row", () => {
    const mgr = createDynamicDataLifecycleManager();
    const result = mgr.ensureSource(SOURCE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot).toEqual({
        sourceId: SOURCE,
        state: "idle",
        revision: 1,
      });
      expect(result.unchanged).toBeUndefined();
    }
    expect(mgr.listStates()).toHaveLength(1);
    const again = mgr.ensureSource(SOURCE);
    expect(again.ok).toBe(true);
    if (again.ok) {
      expect(again.unchanged).toBe(true);
      expect(again.snapshot.revision).toBe(1);
    }
  });

  it("rejects invalid source ids on ensure and transitions", () => {
    const mgr = createDynamicDataLifecycleManager();
    const bad = mgr.ensureSource("https://cdn.example/clouds.jpg");
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.error).toBe("invalid sourceId");
    }
    expect(mgr.markLoading("Not A Valid Id").ok).toBe(false);
  });

  it("runs the happy path idle → loading → ready with version hint", () => {
    const mgr = createDynamicDataLifecycleManager();
    expect(mgr.markLoading(SOURCE).ok).toBe(true);
    expect(mgr.getState(SOURCE).state).toBe("loading");

    const ready = mgr.markReady(SOURCE, { latestVersionId: "v-2026-08-05T12" });
    expect(ready.ok).toBe(true);
    if (ready.ok) {
      expect(ready.snapshot.state).toBe("ready");
      expect(ready.snapshot.latestVersionId).toBe("v-2026-08-05T12");
      expect(ready.snapshot.lastError).toBeUndefined();
    }
  });

  it("supports ready → stale → loading refresh and error → retry", () => {
    const mgr = createDynamicDataLifecycleManager();
    mgr.markLoading(SOURCE);
    mgr.markReady(SOURCE, { latestVersionId: "v1" });

    expect(mgr.markStale(SOURCE).ok).toBe(true);
    expect(mgr.getState(SOURCE)).toMatchObject({
      state: "stale",
      latestVersionId: "v1",
    });

    expect(mgr.markLoading(SOURCE).ok).toBe(true);
    expect(mgr.getState(SOURCE).latestVersionId).toBe("v1");

    const err = mgr.markError(SOURCE, "upstream 503");
    expect(err.ok).toBe(true);
    if (err.ok) {
      expect(err.snapshot.state).toBe("error");
      expect(err.snapshot.lastError).toBe("upstream 503");
      // Version hint preserved for chrome / retry context.
      expect(err.snapshot.latestVersionId).toBe("v1");
    }

    expect(mgr.markLoading(SOURCE).ok).toBe(true);
    expect(mgr.markReady(SOURCE, { latestVersionId: "v2" }).ok).toBe(true);
    expect(mgr.getState(SOURCE)).toMatchObject({
      state: "ready",
      latestVersionId: "v2",
    });
    expect(mgr.getState(SOURCE).lastError).toBeUndefined();
  });

  it("rejects illegal transitions and empty error messages", () => {
    const mgr = createDynamicDataLifecycleManager();
    mgr.ensureSource(SOURCE);
    const staleFromIdle = mgr.markStale(SOURCE);
    expect(staleFromIdle.ok).toBe(false);
    if (!staleFromIdle.ok) {
      expect(staleFromIdle.error).toBe("invalid transition idle → stale");
      expect(staleFromIdle.snapshot.state).toBe("idle");
    }

    mgr.markLoading(SOURCE);
    expect(mgr.markError(SOURCE, "   ").ok).toBe(false);
    expect(mgr.markReady(SOURCE, { latestVersionId: "" }).ok).toBe(false);
  });

  it("markIdle clears error and version hints", () => {
    const mgr = createDynamicDataLifecycleManager();
    mgr.markLoading(SOURCE);
    mgr.markReady(SOURCE, { latestVersionId: "v1" });
    mgr.markError(SOURCE, "boom");
    const idle = mgr.markIdle(SOURCE);
    expect(idle.ok).toBe(true);
    if (idle.ok) {
      expect(idle.snapshot).toEqual({
        sourceId: SOURCE,
        state: "idle",
        revision: idle.snapshot.revision,
      });
      expect(idle.snapshot.lastError).toBeUndefined();
      expect(idle.snapshot.latestVersionId).toBeUndefined();
    }
  });

  it("subscribe notifies on subscribe and on successful transitions", () => {
    const mgr = createDynamicDataLifecycleManager();
    const events: string[] = [];
    const unsub = mgr.subscribe(SOURCE, (snap) => {
      events.push(`${snap.state}@${snap.revision}`);
    });

    expect(events).toEqual(["idle@1"]);
    mgr.markLoading(SOURCE);
    mgr.markReady(SOURCE, { latestVersionId: "v1" });
    expect(events).toEqual(["idle@1", "loading@2", "ready@3"]);

    // Idempotent no-op does not notify again.
    const noop = mgr.markReady(SOURCE, { latestVersionId: "v1" });
    expect(noop.ok).toBe(true);
    if (noop.ok) expect(noop.unchanged).toBe(true);
    expect(events).toEqual(["idle@1", "loading@2", "ready@3"]);

    unsub();
    mgr.markStale(SOURCE);
    expect(events).toEqual(["idle@1", "loading@2", "ready@3"]);
    expect(mgr.getState(SOURCE).state).toBe("stale");
  });

  it("supports multiple listeners and forget drops the row", () => {
    const mgr = createDynamicDataLifecycleManager();
    const a = vi.fn();
    const b = vi.fn();
    const unsubA = mgr.subscribe(SOURCE, a);
    mgr.subscribe(SOURCE, b);

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);

    mgr.markLoading(SOURCE);
    expect(a).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenCalledTimes(2);

    unsubA();
    mgr.markReady(SOURCE);
    expect(a).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenCalledTimes(3);

    mgr.forget(SOURCE);
    expect(mgr.listStates()).toEqual([]);
    expect(mgr.getState(SOURCE).revision).toBe(0);
  });

  it("does not couple to store, network, or RenderPlan APIs", () => {
    // Boundary assertion: manager factory and transitions are sync / local only.
    const mgr = createDynamicDataLifecycleManager();
    const result = mgr.markLoading(SOURCE);
    expect(result.ok).toBe(true);
    expect(typeof (mgr as { fetch?: unknown }).fetch).toBe("undefined");
  });
});
