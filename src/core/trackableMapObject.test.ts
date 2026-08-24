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
import { sublunarPoint } from "./sublunarPoint";
import { subsolarPoint } from "./subsolarPoint";
import {
  TRACKABLE_MAP_OBJECT_IDS,
  isTrackableMapObjectId,
  resolveTrackableMapObject,
  resolveTrackableMapObjectAtInstant,
  trackableMapObjectAuthoritativeStateAt,
} from "./trackableMapObject";

const MOON_POS = { lonDeg: 40, latDeg: 18 };
const SUN_POS = { lonDeg: -80, latDeg: -12 };
const STATE = { moon: MOON_POS, sun: SUN_POS };
const INSTANT = Date.UTC(2026, 5, 21, 12, 0, 0);

describe("TrackableMapObjectId", () => {
  it("gives Moon and Sun distinct stable identities, not coordinates", () => {
    expect(TRACKABLE_MAP_OBJECT_IDS).toEqual(["moon", "sun"]);
    expect(isTrackableMapObjectId("moon")).toBe(true);
    expect(isTrackableMapObjectId("sun")).toBe(true);
    expect(isTrackableMapObjectId("iss")).toBe(false);
    expect(isTrackableMapObjectId("earth")).toBe(false);
    expect("moon").not.toBe("sun");
  });

  it("does not treat lon/lat as identity", () => {
    const moonA = resolveTrackableMapObject("moon", STATE);
    const moonB = resolveTrackableMapObject("moon", {
      moon: { lonDeg: 179, latDeg: -28 },
      sun: SUN_POS,
    });
    expect(moonA).not.toEqual(moonB);
    expect(resolveTrackableMapObject("moon", STATE)).toEqual(MOON_POS);
    expect(resolveTrackableMapObject("sun", STATE)).toEqual(SUN_POS);
  });
});

describe("resolveTrackableMapObject", () => {
  it("resolves Moon from supplied sublunar state and Sun from subsolar state", () => {
    expect(resolveTrackableMapObject("moon", STATE)).toEqual(MOON_POS);
    expect(resolveTrackableMapObject("sun", STATE)).toEqual(SUN_POS);
  });

  it("does not swap bodies when coordinates are exchanged", () => {
    const swapped = { moon: SUN_POS, sun: MOON_POS };
    expect(resolveTrackableMapObject("moon", swapped)).toEqual(SUN_POS);
    expect(resolveTrackableMapObject("sun", swapped)).toEqual(MOON_POS);
  });
});

describe("resolveTrackableMapObjectAtInstant", () => {
  it("uses the existing sublunar and subsolar authorities, not a second astronomy path", () => {
    const gathered = trackableMapObjectAuthoritativeStateAt(INSTANT);
    const moon = sublunarPoint(INSTANT);
    const sun = subsolarPoint(INSTANT);
    expect(gathered.moon).toEqual({ lonDeg: moon.lonDeg, latDeg: moon.latDeg });
    expect(gathered.sun).toEqual({ lonDeg: sun.lonDeg, latDeg: sun.latDeg });
    expect(resolveTrackableMapObjectAtInstant("moon", INSTANT)).toEqual(gathered.moon);
    expect(resolveTrackableMapObjectAtInstant("sun", INSTANT)).toEqual(gathered.sun);
    expect(gathered.moon).not.toEqual(gathered.sun);
  });
});
