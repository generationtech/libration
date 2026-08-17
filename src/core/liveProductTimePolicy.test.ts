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
  LIVE_PRODUCT_TIME_TOLERANCE_MS,
  isProductTimeLiveEnough,
} from "./liveProductTimePolicy";

const WALL = 1_700_000_000_000;

describe("isProductTimeLiveEnough", () => {
  it("uses a 5-minute inclusive tolerance", () => {
    expect(LIVE_PRODUCT_TIME_TOLERANCE_MS).toBe(5 * 60 * 1000);
  });

  it("treats identical product and wall clocks as live-enough", () => {
    expect(isProductTimeLiveEnough(WALL, WALL)).toBe(true);
  });

  it("qualifies just inside the window in both directions", () => {
    expect(isProductTimeLiveEnough(WALL + 4 * 60_000 + 59_000, WALL)).toBe(true);
    expect(isProductTimeLiveEnough(WALL - 4 * 60_000 - 59_000, WALL)).toBe(true);
  });

  it("qualifies at the inclusive bound", () => {
    expect(isProductTimeLiveEnough(WALL + LIVE_PRODUCT_TIME_TOLERANCE_MS, WALL)).toBe(
      true,
    );
    expect(isProductTimeLiveEnough(WALL - LIVE_PRODUCT_TIME_TOLERANCE_MS, WALL)).toBe(
      true,
    );
  });

  it("suppresses just outside the window", () => {
    expect(isProductTimeLiveEnough(WALL + 5 * 60_000 + 1_000, WALL)).toBe(false);
    expect(isProductTimeLiveEnough(WALL - 5 * 60_000 - 1_000, WALL)).toBe(false);
  });

  it("rejects historical and far-future demo instants", () => {
    expect(isProductTimeLiveEnough(Date.UTC(2017, 7, 21, 18, 25, 30), WALL)).toBe(
      false,
    );
    expect(isProductTimeLiveEnough(Date.UTC(2030, 5, 15, 12, 0, 0), WALL)).toBe(
      false,
    );
  });

  it("rejects non-finite instants", () => {
    expect(isProductTimeLiveEnough(Number.NaN, WALL)).toBe(false);
    expect(isProductTimeLiveEnough(WALL, Number.POSITIVE_INFINITY)).toBe(false);
  });

  it("is a cheap arithmetic check", () => {
    const t0 = performance.now();
    for (let i = 0; i < 50_000; i += 1) {
      isProductTimeLiveEnough(WALL + (i % 7) * 1000, WALL);
    }
    const elapsedMs = performance.now() - t0;
    expect(elapsedMs).toBeLessThan(50);
  });
});
