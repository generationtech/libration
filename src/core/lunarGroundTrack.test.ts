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

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { sublunarPoint } from "./sublunarPoint";
import {
  DEFAULT_LUNAR_GROUND_TRACK_FUTURE_HOURS,
  DEFAULT_LUNAR_GROUND_TRACK_PAST_HOURS,
  LUNAR_GROUND_TRACK_CACHE_BUCKET_MS,
  LUNAR_GROUND_TRACK_SAMPLE_INTERVAL_MS,
  expectedLunarGroundTrackSampleCount,
  normalizeLunarGroundTrackExtentHours,
  resetLunarGroundTrackCacheForTests,
  sampleLunarGroundTrack,
} from "./lunarGroundTrack";

const NOW = Date.UTC(2026, 8, 7, 16, 0, 0, 0);

describe("lunarGroundTrack", () => {
  it("normalizes extents onto the allowed set", () => {
    expect(normalizeLunarGroundTrackExtentHours(6)).toBe(6);
    expect(normalizeLunarGroundTrackExtentHours(24)).toBe(24);
    expect(normalizeLunarGroundTrackExtentHours(72)).toBe(72);
    expect(normalizeLunarGroundTrackExtentHours(13)).toBe(DEFAULT_LUNAR_GROUND_TRACK_PAST_HOURS);
    expect(normalizeLunarGroundTrackExtentHours(undefined)).toBe(24);
    expect(normalizeLunarGroundTrackExtentHours(Number.NaN)).toBe(24);
  });

  it("places the current sample on sublunarPoint at the canonical instant", () => {
    resetLunarGroundTrackCacheForTests();
    const track = sampleLunarGroundTrack(NOW, 24, 24);
    const moon = sublunarPoint(NOW);
    expect(track.current.latDeg).toBeCloseTo(moon.latDeg, 12);
    expect(track.current.lonDeg).toBeCloseTo(moon.lonDeg, 12);
  });

  it("is deterministic for a fixed product time", () => {
    resetLunarGroundTrackCacheForTests();
    const a = sampleLunarGroundTrack(NOW, 12, 6);
    resetLunarGroundTrackCacheForTests();
    const b = sampleLunarGroundTrack(NOW, 12, 6);
    expect(a.current).toEqual(b.current);
    expect(a.past).toEqual(b.past);
    expect(a.future).toEqual(b.future);
    expect(a.ticks).toEqual(b.ticks);
  });

  it("matches expected sample counts for the default 24+24 h window", () => {
    resetLunarGroundTrackCacheForTests();
    const track = sampleLunarGroundTrack(NOW, 24, 24);
    const expected = expectedLunarGroundTrackSampleCount(24, 24);
    expect(track.past).toHaveLength(expected.past);
    expect(track.future).toHaveLength(expected.future);
    expect(track.ticks).toHaveLength(expected.ticks);
    expect(LUNAR_GROUND_TRACK_SAMPLE_INTERVAL_MS).toBe(10 * 60 * 1000);
  });

  it("spans the configured past and future extents", () => {
    resetLunarGroundTrackCacheForTests();
    const track = sampleLunarGroundTrack(NOW, 6, 12);
    const pastEnd = sublunarPoint(NOW - 6 * 3600 * 1000);
    const futureEnd = sublunarPoint(NOW + 12 * 3600 * 1000);
    expect(track.past[0]!.latDeg).toBeCloseTo(pastEnd.latDeg, 12);
    expect(track.past[0]!.lonDeg).toBeCloseTo(pastEnd.lonDeg, 12);
    const lastFuture = track.future[track.future.length - 1]!;
    expect(lastFuture.latDeg).toBeCloseTo(futureEnd.latDeg, 12);
    expect(lastFuture.lonDeg).toBeCloseTo(futureEnd.lonDeg, 12);
  });

  it("does not clamp latitude to the tropics", () => {
    resetLunarGroundTrackCacheForTests();
    const track = sampleLunarGroundTrack(NOW, 72, 72);
    const lats = [track.current, ...track.past, ...track.future].map((p) => p.latDeg);
    expect(Math.max(...lats)).toBeLessThanOrEqual(90);
    expect(Math.min(...lats)).toBeGreaterThanOrEqual(-90);
    for (const p of track.past) {
      expect(p.latDeg).not.toBe(23.44);
      expect(p.latDeg).not.toBe(-23.44);
    }
  });

  it("updates when product time leaves the cache bucket and stays stable inside it", () => {
    resetLunarGroundTrackCacheForTests();
    const a = sampleLunarGroundTrack(NOW, 24, 24);
    const b = sampleLunarGroundTrack(NOW, 24, 24);
    expect(a.past).toBe(b.past);
    expect(a.future).toBe(b.future);
    const sameBucket = sampleLunarGroundTrack(NOW + LUNAR_GROUND_TRACK_CACHE_BUCKET_MS - 1, 24, 24);
    expect(sameBucket.past).toBe(a.past);
    const nextBucket = sampleLunarGroundTrack(NOW + LUNAR_GROUND_TRACK_CACHE_BUCKET_MS, 24, 24);
    expect(nextBucket.past).not.toBe(a.past);
    expect(nextBucket.current.lonDeg).not.toBeCloseTo(a.current.lonDeg, 6);
  });

  it("recomputes when extent configuration changes", () => {
    resetLunarGroundTrackCacheForTests();
    const wide = sampleLunarGroundTrack(NOW, 48, 24);
    const narrow = sampleLunarGroundTrack(NOW, 6, 24);
    expect(narrow.past.length).toBeLessThan(wide.past.length);
    expect(narrow.past).not.toBe(wide.past);
  });

  it("does not call Date.now in the sampler module", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, "lunarGroundTrack.ts"), "utf8");
    expect(src).not.toMatch(/Date\.now\s*\(/);
  });

  it("uses default 24 h extents when omitted", () => {
    resetLunarGroundTrackCacheForTests();
    const a = sampleLunarGroundTrack(NOW);
    const b = sampleLunarGroundTrack(
      NOW,
      DEFAULT_LUNAR_GROUND_TRACK_PAST_HOURS,
      DEFAULT_LUNAR_GROUND_TRACK_FUTURE_HOURS,
    );
    expect(a.past.length).toBe(b.past.length);
    expect(a.future.length).toBe(b.future.length);
  });
});
