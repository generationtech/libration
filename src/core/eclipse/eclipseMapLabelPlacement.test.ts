/*
 * Libration
 * Copyright (C) 2026 Ken McDonald
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 */

import { describe, expect, it } from "vitest";
import { placeEclipseMapLabel } from "./eclipseMapLabelPlacement";

describe("placeEclipseMapLabel", () => {
  it("keeps a non-overlapping label at the preferred position", () => {
    const placed = placeEclipseMapLabel({
      preferredX: 400,
      preferredY: 300,
      text: "Total lunar eclipse",
      sizePx: 13,
      viewportWidthPx: 1920,
      viewportHeightPx: 1080,
      avoidDiscs: [{ x: 100, y: 100, radiusPx: 20 }],
    });
    expect(placed).toEqual({
      x: 400,
      y: 300,
      textAlign: "center",
      textBaseline: "middle",
    });
  });

  it("offsets a lunar label that intersects the Moon glyph to the first free candidate (right)", () => {
    const placed = placeEclipseMapLabel({
      preferredX: 400,
      preferredY: 300,
      text: "Total lunar eclipse",
      sizePx: 13,
      viewportWidthPx: 1920,
      viewportHeightPx: 1080,
      avoidDiscs: [{ x: 400, y: 300, radiusPx: 24 }],
    });
    expect(placed.x).toBeGreaterThan(400);
    expect(placed.y).toBe(300);
    expect(placed.textAlign).toBe("left");
    expect(placed.textBaseline).toBe("middle");
  });

  it("uses left when right would leave the viewport", () => {
    const placed = placeEclipseMapLabel({
      preferredX: 1900,
      preferredY: 300,
      text: "Total lunar eclipse",
      sizePx: 13,
      viewportWidthPx: 1920,
      viewportHeightPx: 1080,
      avoidDiscs: [{ x: 1900, y: 300, radiusPx: 24 }],
    });
    expect(placed.x).toBeLessThan(1900);
    expect(placed.textAlign).toBe("right");
  });

  it("offsets a solar label that intersects the Sun/Moon cluster", () => {
    const placed = placeEclipseMapLabel({
      preferredX: 500,
      preferredY: 400,
      text: "Total solar eclipse",
      sizePx: 13,
      viewportWidthPx: 1920,
      viewportHeightPx: 1080,
      avoidDiscs: [
        { x: 496, y: 398, radiusPx: 22 },
        { x: 508, y: 404, radiusPx: 18 },
      ],
    });
    expect(placed.x).not.toBe(500);
    expect(placed.y === 400 || placed.x !== 500).toBe(true);
  });

  it("selects the same candidate for nearby frames (stable priority)", () => {
    const a = placeEclipseMapLabel({
      preferredX: 400,
      preferredY: 300,
      text: "Total lunar eclipse",
      sizePx: 13,
      viewportWidthPx: 1920,
      viewportHeightPx: 1080,
      avoidDiscs: [{ x: 401, y: 300, radiusPx: 24 }],
    });
    const b = placeEclipseMapLabel({
      preferredX: 402,
      preferredY: 301,
      text: "Total lunar eclipse",
      sizePx: 13,
      viewportWidthPx: 1920,
      viewportHeightPx: 1080,
      avoidDiscs: [{ x: 403, y: 301, radiusPx: 24 }],
    });
    expect(a.textAlign).toBe(b.textAlign);
    expect(a.textBaseline).toBe(b.textBaseline);
    expect(Math.abs(a.x - b.x)).toBeLessThan(8);
    expect(Math.abs(a.y - b.y)).toBeLessThan(8);
  });

  it("does not place the label off-screen", () => {
    const placed = placeEclipseMapLabel({
      preferredX: 20,
      preferredY: 20,
      text: "Total lunar eclipse",
      sizePx: 13,
      viewportWidthPx: 1920,
      viewportHeightPx: 1080,
      avoidDiscs: [{ x: 20, y: 20, radiusPx: 30 }],
    });
    expect(placed.x).toBeGreaterThan(8);
    expect(placed.y).toBeGreaterThan(8);
    expect(placed.x).toBeLessThan(1912);
    expect(placed.y).toBeLessThan(1072);
  });
});
