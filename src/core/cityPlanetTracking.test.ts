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
  minimumScaleToCoverSceneFrameEarth,
  sceneCameraVerticalExtentFromFrame,
} from "./sceneCamera";
import { nextAnchorContinuousLonDeg } from "./sceneFrameAnchor";
import {
  anchoredSceneReferenceFrame,
  canonicalLonLatToSceneFrame,
  sceneFrameLonLatToCanonical,
  sceneFrameRasterIdentityOriginX,
  sceneFrameRasterIdentityOriginY,
} from "./sceneReferenceFrame";
import {
  cityTrackableMapObjectId,
  planetTrackableMapObjectId,
  resolveTrackableMapObject,
  trackableMapObjectIdEquals,
  trackableMapObjectIdTieKey,
} from "./trackableMapObject";
import {
  applyTrackingTargetAvailability,
  setTrackingMode,
  setTrackingTarget,
  trackingTargetSelectModel,
  trackingTargetSelectValue,
  tryParseTrackingTargetSelectValue,
} from "./trackingSelection";

const LONDON = { lonDeg: -0.1278, latDeg: 51.5074 };
const KNOXVILLE = { lonDeg: -83.9207, latDeg: 35.9606 };
const JUPITER = { lonDeg: 42.5, latDeg: 12.25 };
const SATURN = { lonDeg: -110, latDeg: -18 };
const W = 800;
const H = 400;

const NAMED_AVAILABLE = { moon: true, sun: true, iss: true } as const;

describe("LIB-092 city and planet tracking identities", () => {
  it("keeps Moon/Sun/ISS distinct from reconstructed city and planet ids", () => {
    const london = cityTrackableMapObjectId("city.london");
    const knoxville = cityTrackableMapObjectId("city.knoxville");
    const jupiter = planetTrackableMapObjectId("jupiter");
    const saturn = planetTrackableMapObjectId("saturn");
    expect(trackableMapObjectIdEquals("moon", london)).toBe(false);
    expect(trackableMapObjectIdEquals(london, knoxville)).toBe(false);
    expect(trackableMapObjectIdEquals(jupiter, saturn)).toBe(false);
    expect(trackableMapObjectIdEquals(london, cityTrackableMapObjectId("city.london"))).toBe(true);
    expect(trackableMapObjectIdEquals(jupiter, planetTrackableMapObjectId("jupiter"))).toBe(true);
    expect(trackableMapObjectIdEquals("moon", "moon")).toBe(true);
  });

  it("round-trips native-select keys for named, city, and planet targets", () => {
    const london = cityTrackableMapObjectId("city.london");
    const jupiter = planetTrackableMapObjectId("jupiter");
    const punctuated = cityTrackableMapObjectId("city.foo:bar/baz");
    for (const target of ["moon", "sun", "iss", london, jupiter, punctuated] as const) {
      const key = trackingTargetSelectValue(target);
      const parsed = tryParseTrackingTargetSelectValue(key);
      expect(parsed.ok).toBe(true);
      if (parsed.ok) {
        expect(trackableMapObjectIdEquals(parsed.target, target)).toBe(true);
      }
    }
    expect(tryParseTrackingTargetSelectValue("earthFixed")).toEqual({ ok: true, target: null });
    expect(tryParseTrackingTargetSelectValue("not-a-target").ok).toBe(false);
  });

  it("groups Earth-fixed, celestial, spacecraft, and cities for the native select", () => {
    const model = trackingTargetSelectModel(
      {
        cities: [
          { id: "city.london", name: "London" },
          { id: "city.knoxville", name: "Knoxville" },
        ],
        planets: [
          { id: "jupiter", displayName: "Jupiter" },
          { id: "saturn", displayName: "Saturn" },
        ],
      },
      { moon: true, sun: true, iss: false },
    );
    expect(model.ungrouped.map((option) => option.value)).toEqual(["earthFixed"]);
    expect(model.groups.map((group) => group.label)).toEqual([
      "Celestial",
      "Spacecraft",
      "Cities",
    ]);
    expect(model.groups[0]!.options.map((option) => option.label)).toEqual([
      "Moon",
      "Sun",
      "Jupiter",
      "Saturn",
    ]);
    expect(model.groups[1]!.options[0]).toMatchObject({ value: "iss", disabled: true });
    expect(model.groups[2]!.options.map((option) => option.label)).toEqual([
      "London",
      "Knoxville",
    ]);
  });
});

describe("LIB-092 city and planet resolution", () => {
  const londonId = cityTrackableMapObjectId("city.london");
  const jupiterId = planetTrackableMapObjectId("jupiter");
  const state = {
    moon: { lonDeg: 10, latDeg: 5 },
    sun: { lonDeg: 20, latDeg: -8 },
    iss: { lonDeg: 30, latDeg: 12 },
    cities: new Map([["city.london", LONDON]]),
    planets: new Map([["jupiter", JUPITER]] as const),
  };

  it("resolves a city to its existing static pin lon/lat", () => {
    expect(resolveTrackableMapObject(londonId, state)).toEqual(LONDON);
  });

  it("resolves a planet to the supplied current mapped subpoint, not a second ephemeris", () => {
    expect(resolveTrackableMapObject(jupiterId, state)).toEqual(JUPITER);
  });

  it("returns null for missing city or planet rather than fabricating a position", () => {
    expect(resolveTrackableMapObject(cityTrackableMapObjectId("city.missing"), state)).toBeNull();
    expect(resolveTrackableMapObject(planetTrackableMapObjectId("mars"), state)).toBeNull();
  });

  it("falls unavailable city/planet selection back to Earth-fixed and keeps mode", () => {
    const available = {
      moon: true,
      sun: true,
      iss: true,
      cities: new Set(["city.london"]),
      planets: new Set(["jupiter"] as const),
    };
    const cityTracked = setTrackingTarget(
      { target: null, rememberedMode: "longitude" },
      londonId,
      available,
    );
    expect(cityTracked.target).toEqual(londonId);
    expect(
      applyTrackingTargetAvailability(cityTracked, {
        ...available,
        cities: new Set(),
      }),
    ).toEqual({ target: null, rememberedMode: "longitude" });
    const planetTracked = setTrackingTarget(cityTracked, jupiterId, available);
    expect(planetTracked.rememberedMode).toBe("longitude");
    expect(
      applyTrackingTargetAvailability(planetTracked, {
        ...available,
        planets: new Set(),
      }),
    ).toEqual({ target: null, rememberedMode: "longitude" });
  });
});

describe("LIB-092 city and planet anchored-frame semantics", () => {
  const londonId = cityTrackableMapObjectId("city.london");
  const jupiterId = planetTrackableMapObjectId("jupiter");

  it("longitude-locks a city to the frame meridian while keeping physical latitude", () => {
    const frame = anchoredSceneReferenceFrame({
      target: londonId,
      lockMode: "longitude",
      continuousAnchorLonDeg: LONDON.lonDeg,
      anchorLatDeg: LONDON.latDeg,
    });
    const scene = canonicalLonLatToSceneFrame(LONDON, frame);
    expect(scene.sceneLonDeg).toBeCloseTo(0, 10);
    expect(scene.sceneLatDeg).toBeCloseTo(LONDON.latDeg, 10);
  });

  it("position-locks a city to the scene origin", () => {
    const frame = anchoredSceneReferenceFrame({
      target: londonId,
      lockMode: "position",
      continuousAnchorLonDeg: LONDON.lonDeg,
      anchorLatDeg: LONDON.latDeg,
    });
    const scene = canonicalLonLatToSceneFrame(LONDON, frame);
    expect(scene.sceneLonDeg).toBeCloseTo(0, 10);
    expect(scene.sceneLatDeg).toBeCloseTo(0, 10);
  });

  it("keeps a static city anchor unchanged while a dynamic object would move", () => {
    const t0 = {
      moon: { lonDeg: 10, latDeg: 4 },
      sun: { lonDeg: 0, latDeg: 0 },
      iss: null,
      cities: new Map([["city.knoxville", KNOXVILLE]]),
    };
    const t1 = {
      ...t0,
      moon: { lonDeg: 40, latDeg: 6 },
    };
    expect(resolveTrackableMapObject(cityTrackableMapObjectId("city.knoxville"), t0)).toEqual(
      KNOXVILLE,
    );
    expect(resolveTrackableMapObject(cityTrackableMapObjectId("city.knoxville"), t1)).toEqual(
      KNOXVILLE,
    );
    expect(t0.moon).not.toEqual(t1.moon);
  });

  it("longitude-locks a planet on the frame meridian with physical mapped latitude", () => {
    const frame = anchoredSceneReferenceFrame({
      target: jupiterId,
      lockMode: "longitude",
      continuousAnchorLonDeg: JUPITER.lonDeg,
      anchorLatDeg: JUPITER.latDeg,
    });
    const scene = canonicalLonLatToSceneFrame(JUPITER, frame);
    expect(scene.sceneLonDeg).toBeCloseTo(0, 10);
    expect(scene.sceneLatDeg).toBeCloseTo(JUPITER.latDeg, 10);
  });

  it("position-locks a planet to the scene origin", () => {
    const frame = anchoredSceneReferenceFrame({
      target: jupiterId,
      lockMode: "position",
      continuousAnchorLonDeg: JUPITER.lonDeg,
      anchorLatDeg: JUPITER.latDeg,
    });
    const scene = canonicalLonLatToSceneFrame(JUPITER, frame);
    expect(scene.sceneLonDeg).toBeCloseTo(0, 10);
    expect(scene.sceneLatDeg).toBeCloseTo(0, 10);
  });

  it("reuses generic continuity around ±180° for a planet longitude", () => {
    const followed = nextAnchorContinuousLonDeg({
      previousContinuousLonDeg: 179,
      nextCanonicalLonDeg: -179,
      policy: "follow",
    });
    expect(followed).toBe(181);
    const cityFollowed = nextAnchorContinuousLonDeg({
      previousContinuousLonDeg: 179,
      nextCanonicalLonDeg: -179,
      policy: "follow",
    });
    expect(cityFollowed).toBe(followed);
  });

  it("applies generic auto-cover from city or planet latitude", () => {
    const cityFrame = anchoredSceneReferenceFrame({
      target: londonId,
      lockMode: "position",
      continuousAnchorLonDeg: LONDON.lonDeg,
      anchorLatDeg: LONDON.latDeg,
    });
    const moonSame = anchoredSceneReferenceFrame({
      target: "moon",
      lockMode: "position",
      continuousAnchorLonDeg: LONDON.lonDeg,
      anchorLatDeg: LONDON.latDeg,
    });
    const planetFrame = anchoredSceneReferenceFrame({
      target: jupiterId,
      lockMode: "position",
      continuousAnchorLonDeg: SATURN.lonDeg,
      anchorLatDeg: SATURN.latDeg,
    });
    const moonPlanet = anchoredSceneReferenceFrame({
      target: "moon",
      lockMode: "position",
      continuousAnchorLonDeg: SATURN.lonDeg,
      anchorLatDeg: SATURN.latDeg,
    });
    expect(minimumScaleToCoverSceneFrameEarth(sceneCameraVerticalExtentFromFrame(cityFrame))).toBe(
      minimumScaleToCoverSceneFrameEarth(sceneCameraVerticalExtentFromFrame(moonSame)),
    );
    expect(minimumScaleToCoverSceneFrameEarth(sceneCameraVerticalExtentFromFrame(planetFrame))).toBe(
      minimumScaleToCoverSceneFrameEarth(sceneCameraVerticalExtentFromFrame(moonPlanet)),
    );
  });

  it("treats target identity as metadata for identical numeric anchors", () => {
    const args = {
      lockMode: "position" as const,
      continuousAnchorLonDeg: 33,
      anchorLatDeg: 21,
    };
    const moon = anchoredSceneReferenceFrame({ target: "moon", ...args });
    const city = anchoredSceneReferenceFrame({ target: londonId, ...args });
    const planet = anchoredSceneReferenceFrame({ target: jupiterId, ...args });
    const sample = { lonDeg: 40, latDeg: 10 };
    expect(canonicalLonLatToSceneFrame(sample, moon)).toEqual(
      canonicalLonLatToSceneFrame(sample, city),
    );
    expect(canonicalLonLatToSceneFrame(sample, moon)).toEqual(
      canonicalLonLatToSceneFrame(sample, planet),
    );
    const scene = canonicalLonLatToSceneFrame(sample, moon);
    expect(sceneFrameLonLatToCanonical(scene, moon)).toEqual(
      sceneFrameLonLatToCanonical(scene, city),
    );
    expect(sceneFrameRasterIdentityOriginX(W, moon)).toBe(sceneFrameRasterIdentityOriginX(W, city));
    expect(sceneFrameRasterIdentityOriginY(H, moon)).toBe(sceneFrameRasterIdentityOriginY(H, city));
    expect(sceneCameraVerticalExtentFromFrame(moon)).toEqual(sceneCameraVerticalExtentFromFrame(city));
    expect(minimumScaleToCoverSceneFrameEarth(sceneCameraVerticalExtentFromFrame(moon))).toBe(
      minimumScaleToCoverSceneFrameEarth(sceneCameraVerticalExtentFromFrame(planet)),
    );
  });

  it("retains mode across city and planet target switches", () => {
    const available = {
      ...NAMED_AVAILABLE,
      cities: new Set(["city.london"]),
      planets: new Set(["jupiter"] as const),
    };
    const moonLon = setTrackingMode(
      setTrackingTarget({ target: null, rememberedMode: "position" }, "moon", available),
      "longitude",
    );
    expect(setTrackingTarget(moonLon, londonId, available)).toEqual({
      target: londonId,
      rememberedMode: "longitude",
    });
    expect(
      setTrackingTarget(
        setTrackingTarget(moonLon, londonId, available),
        planetTrackableMapObjectId("jupiter"),
        available,
      ),
    ).toEqual({
      target: planetTrackableMapObjectId("jupiter"),
      rememberedMode: "longitude",
    });
  });

  it("orders overlap ties moon, sun, iss, then planets, then cities", () => {
    expect(trackableMapObjectIdTieKey("moon") < trackableMapObjectIdTieKey("sun")).toBe(true);
    expect(trackableMapObjectIdTieKey("sun") < trackableMapObjectIdTieKey("iss")).toBe(true);
    expect(
      trackableMapObjectIdTieKey("iss") <
        trackableMapObjectIdTieKey(planetTrackableMapObjectId("jupiter")),
    ).toBe(true);
    expect(
      trackableMapObjectIdTieKey(planetTrackableMapObjectId("jupiter")) <
        trackableMapObjectIdTieKey(cityTrackableMapObjectId("city.london")),
    ).toBe(true);
  });
});
