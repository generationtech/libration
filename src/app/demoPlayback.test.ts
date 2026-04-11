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
  DEFAULT_DATA_CONFIG,
  DEFAULT_DEMO_TIME_CONFIG,
} from "../config/appConfig";
import {
  applyDemoPlaybackPause,
  applyDemoPlaybackReset,
  applyDemoPlaybackResume,
  computeEffectiveRenderTimeMs,
  isDemoTimeActive,
  parseUtcIsoToUnixMs,
  resolvedDemoStartUnixMs,
} from "./demoPlayback";

function demoData(
  overrides: Partial<{
    mode: "static" | "demo";
    enabled: boolean;
    startIsoUtc: string;
    speedMultiplier: number;
  }> = {},
) {
  return {
    ...DEFAULT_DATA_CONFIG,
    mode: overrides.mode ?? "demo",
    showDataAnnotations: false,
    demoTime: {
      ...DEFAULT_DEMO_TIME_CONFIG,
      enabled: overrides.enabled ?? true,
      startIsoUtc: overrides.startIsoUtc ?? DEFAULT_DEMO_TIME_CONFIG.startIsoUtc,
      speedMultiplier: overrides.speedMultiplier ?? 60,
    },
  };
}

describe("demoPlayback", () => {
  it("isDemoTimeActive is false for static mode or disabled demo time", () => {
    expect(isDemoTimeActive(DEFAULT_DATA_CONFIG)).toBe(false);
    expect(
      isDemoTimeActive(
        demoData({ mode: "static", enabled: true }),
      ),
    ).toBe(false);
    expect(isDemoTimeActive(demoData({ enabled: false }))).toBe(false);
    expect(isDemoTimeActive(demoData({ enabled: true }))).toBe(true);
  });

  it("parseUtcIsoToUnixMs returns null for invalid strings", () => {
    expect(parseUtcIsoToUnixMs("")).toBeNull();
    expect(parseUtcIsoToUnixMs("not-a-date")).toBeNull();
  });

  it("computeEffectiveRenderTimeMs uses wall clock when demo time is off", () => {
    const r = computeEffectiveRenderTimeMs(
      1_700_000_000_000,
      DEFAULT_DATA_CONFIG,
      null,
    );
    expect(r).toEqual({
      nowMs: 1_700_000_000_000,
      simulated: false,
      next: null,
    });
  });

  it("demo mode with demo time disabled uses wall clock", () => {
    const d = demoData({ enabled: false });
    const r = computeEffectiveRenderTimeMs(1_700_000_000_111, d, null);
    expect(r.simulated).toBe(false);
    expect(r.nowMs).toBe(1_700_000_000_111);
    expect(r.next).toBeNull();
  });

  it("derives synthetic instants from baseline × speed", () => {
    const start = resolvedDemoStartUnixMs(DEFAULT_DEMO_TIME_CONFIG.startIsoUtc);
    const t0 = 1_000_000;
    const d = demoData({ speedMultiplier: 10 });
    const a = computeEffectiveRenderTimeMs(t0, d, null);
    expect(a.simulated).toBe(true);
    expect(a.nowMs).toBe(start);
    expect(a.next).not.toBeNull();

    const t1 = t0 + 1_000;
    const b = computeEffectiveRenderTimeMs(t1, d, a.next);
    expect(b.nowMs).toBe(start + 10_000);
    expect(b.next).toBe(a.next);
  });

  it("re-anchors when demo start ISO changes", () => {
    const d1 = demoData({ startIsoUtc: "2035-01-01T00:00:00.000Z" });
    const s1 = resolvedDemoStartUnixMs(d1.demoTime.startIsoUtc);
    const r1 = computeEffectiveRenderTimeMs(100, d1, null);
    expect(r1.nowMs).toBe(s1);

    const d2 = {
      ...d1,
      demoTime: { ...d1.demoTime, startIsoUtc: "2040-06-01T00:00:00.000Z" },
    };
    const s2 = resolvedDemoStartUnixMs(d2.demoTime.startIsoUtc);
    const r2 = computeEffectiveRenderTimeMs(200, d2, r1.next);
    expect(r2.nowMs).toBe(s2);
  });

  it("preserves continuity when speed changes", () => {
    const d1 = demoData({ speedMultiplier: 2 });
    const start = resolvedDemoStartUnixMs(d1.demoTime.startIsoUtc);
    const t0 = 1_000_000;
    const a = computeEffectiveRenderTimeMs(t0, d1, null);
    const t1 = t0 + 1000;
    const mid = computeEffectiveRenderTimeMs(t1, d1, a.next);
    expect(mid.nowMs).toBe(start + 2000);

    const d2 = { ...d1, demoTime: { ...d1.demoTime, speedMultiplier: 5 } };
    const t2 = t1 + 500;
    const after = computeEffectiveRenderTimeMs(t2, d2, mid.next);
    const expectedAtChange = start + (t2 - t0) * 2;
    expect(after.nowMs).toBe(expectedAtChange);
    const t3 = t2 + 1000;
    const step = computeEffectiveRenderTimeMs(t3, d2, after.next);
    expect(step.nowMs).toBe(expectedAtChange + 5_000);
  });

  it("pause freezes effective demo time across frames", () => {
    const d = demoData({ speedMultiplier: 10 });
    const t0 = 1_000_000;
    const step1 = computeEffectiveRenderTimeMs(t0, d, null);
    const t1 = t0 + 500;
    const step2 = computeEffectiveRenderTimeMs(t1, d, step1.next);
    const frozen = applyDemoPlaybackPause(step2.nowMs, step2.next);
    expect(frozen?.paused).toBe(true);
    expect(frozen?.pausedDemoNowMs).toBe(step2.nowMs);

    const t2 = t1 + 999_999;
    const whilePaused = computeEffectiveRenderTimeMs(t2, d, frozen);
    expect(whilePaused.nowMs).toBe(step2.nowMs);
  });

  it("resume continues from paused demo time without jump", () => {
    const d = demoData({ speedMultiplier: 2 });
    const t0 = 1_000_000;
    const a = computeEffectiveRenderTimeMs(t0, d, null);
    const t1 = t0 + 1000;
    const b = computeEffectiveRenderTimeMs(t1, d, a.next);
    const paused = applyDemoPlaybackPause(b.nowMs, b.next);
    const tResume = t1 + 5000;
    const resumed = applyDemoPlaybackResume(tResume, d, paused);
    expect(resumed?.paused).toBe(false);
    const c = computeEffectiveRenderTimeMs(tResume, d, resumed);
    expect(c.nowMs).toBe(b.nowMs);
    const t2 = tResume + 1000;
    const d2 = computeEffectiveRenderTimeMs(t2, d, c.next);
    expect(d2.nowMs).toBe(b.nowMs + 2000);
  });

  it("reset returns to configured demo start instant", () => {
    const d = demoData({
      startIsoUtc: "2030-01-01T00:00:00.000Z",
      speedMultiplier: 60,
    });
    const start = resolvedDemoStartUnixMs(d.demoTime.startIsoUtc);
    const t0 = 5_000_000;
    const step1 = computeEffectiveRenderTimeMs(t0, d, null);
    const step2 = computeEffectiveRenderTimeMs(t0 + 10_000, d, step1.next);
    expect(step2.nowMs).not.toBe(start);

    const reset = applyDemoPlaybackReset(t0 + 20_000, d, step2.next);
    expect(reset).not.toBeNull();
    expect(reset?.paused).toBe(false);
    const after = computeEffectiveRenderTimeMs(t0 + 20_000, d, reset);
    expect(after.nowMs).toBe(start);
  });

  it("reset while paused stays paused at configured demo start", () => {
    const d = demoData({
      startIsoUtc: "2030-01-01T00:00:00.000Z",
      speedMultiplier: 60,
    });
    const start = resolvedDemoStartUnixMs(d.demoTime.startIsoUtc);
    const t0 = 5_000_000;
    const step1 = computeEffectiveRenderTimeMs(t0, d, null);
    const step2 = computeEffectiveRenderTimeMs(t0 + 10_000, d, step1.next);
    const paused = applyDemoPlaybackPause(step2.nowMs, step2.next);
    const reset = applyDemoPlaybackReset(t0 + 20_000, d, paused);
    expect(reset?.paused).toBe(true);
    expect(reset?.pausedDemoNowMs).toBe(start);
    const after = computeEffectiveRenderTimeMs(t0 + 20_000, d, reset);
    expect(after.nowMs).toBe(start);
  });

  it("applyDemoPlaybackReset returns null when demo time is inactive", () => {
    expect(applyDemoPlaybackReset(100, DEFAULT_DATA_CONFIG)).toBeNull();
    expect(applyDemoPlaybackReset(100, demoData({ enabled: false }))).toBeNull();
  });

  it("speed change while paused updates session speed without advancing demo clock", () => {
    const d1 = demoData({ speedMultiplier: 2 });
    const t0 = 1_000_000;
    const a = computeEffectiveRenderTimeMs(t0, d1, null);
    const t1 = t0 + 1000;
    const b = computeEffectiveRenderTimeMs(t1, d1, a.next);
    const paused = applyDemoPlaybackPause(b.nowMs, b.next);
    const d2 = { ...d1, demoTime: { ...d1.demoTime, speedMultiplier: 7 } };
    const c = computeEffectiveRenderTimeMs(t1 + 500, d2, paused);
    expect(c.nowMs).toBe(b.nowMs);
    expect(c.next?.session.lastSpeed).toBe(7);
  });
});
