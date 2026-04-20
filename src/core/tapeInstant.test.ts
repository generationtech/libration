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
import { deriveCivilProjection } from "./civilProjection.ts";
import { instantAtBandCivilHour, instantAtTapePosition } from "./tapeInstant.ts";
import { readWallClockPartsInZone } from "./wallTimeInZone.ts";

describe("tapeInstant", () => {
  it("instantAtBandCivilHour: band civil noon matches deriveCivilProjection fractional hour at that instant", () => {
    const nowUtcInstant = Date.UTC(2026, 7, 10, 16, 30, 0);
    const tz = "America/New_York";
    const noon = instantAtBandCivilHour(nowUtcInstant, tz, 12);
    expect(noon).not.toBeNull();
    const cp = deriveCivilProjection(noon!, tz);
    expect(cp.fractionalHour).toBeCloseTo(12, 5);
    expect(cp.localHour).toBe(12);
  });

  it("instantAtTapePosition(0): same calendar band hour as deriveCivilProjection fractional hour", () => {
    const nowUtcInstant = Date.UTC(2026, 7, 10, 16, 30, 0);
    const tz = "America/New_York";
    const t0 = instantAtTapePosition(nowUtcInstant, tz, 0);
    expect(t0).not.toBeNull();
    const parts = readWallClockPartsInZone(t0!, tz);
    const { fractionalHour } = deriveCivilProjection(nowUtcInstant, tz);
    expect(parts.h).toBe(Math.floor(((fractionalHour % 24) + 24) % 24));
  });
});
