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
import { DEFAULT_ISS_ORBITAL_PRESENTATION } from "../core/issOrbitalPresentation";
import { DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID } from "../config/appConfig";
import { DEFAULT_PLANETARY_OBJECTS_PRESENTATION } from "../core/planetaryObjectsPresentation";
import {
  cityTrackableMapObjectId,
  planetTrackableMapObjectId,
  trackableMapObjectIdEquals,
} from "../core/trackableMapObject";
import { CITY_PINS_KIND, type CityPinsPayload } from "../layers/cityPinsPayload";
import { PLANETARY_OBJECTS_KIND, type PlanetaryObjectsPayload } from "../layers/planetaryObjectsPayload";
import { collectTrackableTargetCatalog } from "./trackableTargetCatalog";
import {
  IDENTITY_SCENE_CAMERA,
  clampSceneCamera,
  type SceneCamera,
} from "../core/sceneCamera";
import {
  EARTH_FIXED_SCENE_REFERENCE_FRAME,
  moonLongitudeLockedSceneReferenceFrame,
  moonPositionLockedSceneReferenceFrame,
  sunLongitudeLockedSceneReferenceFrame,
  sunPositionLockedSceneReferenceFrame,
  type SceneReferenceFrame,
} from "../core/sceneReferenceFrame";
import { DEFAULT_SUBLUNAR_MARKER_APPEARANCE } from "../core/sublunarMarkerAppearance";
import { DYNAMIC_POINT_FEATURES_KIND } from "../layers/dynamicPointFeaturesPayload";
import { DYNAMIC_TRACKS_KIND, type DynamicTracksPayload } from "../layers/dynamicTracksPayload";
import { SUBLUNAR_MARKER_KIND, type SublunarMarkerPayload } from "../layers/sublunarMarkerPayload";
import { SUBSOLAR_MARKER_KIND, type SubsolarMarkerPayload } from "../layers/subsolarMarkerPayload";
import type { RenderableLayerState } from "./types";
import {
  collectIssCurrentGlyphCopies,
} from "./renderPlan/sceneDynamicTracksPlan";
import { buildSubsolarMarkerRenderPlan } from "./renderPlan/sceneSubsolarSublunarMarkersPlan";
import { collectTrackableMapObjectHitTargets } from "./trackableMapObjectHitTargets";

const W = 800;
const H = 400;
const NOW = Date.UTC(2026, 7, 17, 14, 0, 0);

function camera(partial: Partial<SceneCamera>): SceneCamera {
  return clampSceneCamera({ ...IDENTITY_SCENE_CAMERA, ...partial });
}

function layer(
  id: string,
  type: RenderableLayerState["type"],
  data: unknown,
  visible = true,
): RenderableLayerState {
  return {
    id,
    name: id,
    type,
    zIndex: 1,
    visible,
    opacity: 1,
    data,
  };
}

function moonPayload(lonDeg: number, latDeg: number): SublunarMarkerPayload {
  return {
    kind: SUBLUNAR_MARKER_KIND,
    latDeg,
    lonDeg,
    illuminatedFraction: 0.5,
    geocentricElongationDeg: 90,
    waxing: true,
    librationLongitudeDeg: 0,
    librationLatitudeDeg: 0,
    librationOrientationDeg: 0,
    appearance: DEFAULT_SUBLUNAR_MARKER_APPEARANCE,
  };
}

function sunPayload(lonDeg: number, latDeg: number): SubsolarMarkerPayload {
  return {
    kind: SUBSOLAR_MARKER_KIND,
    latDeg,
    lonDeg,
  };
}

function issPayload(lonDeg: number, latDeg: number): DynamicTracksPayload {
  return {
    kind: DYNAMIC_TRACKS_KIND,
    tracks: [
      {
        id: "iss",
        label: "ISS",
        samples: [
          { lonDeg: lonDeg - 10, latDeg, timeMs: NOW - 60_000 },
          { lonDeg, latDeg, timeMs: NOW },
        ],
        pastSamples: [
          { lonDeg: lonDeg - 10, latDeg, timeMs: NOW - 60_000 },
          { lonDeg, latDeg, timeMs: NOW },
        ],
        futureSamples: [{ lonDeg, latDeg, timeMs: NOW }],
      },
    ],
    currentPosition: { lonDeg, latDeg, timeMs: NOW },
    presentation: DEFAULT_ISS_ORBITAL_PRESENTATION,
  };
}

function collect(
  layers: readonly RenderableLayerState[],
  options?: { camera?: SceneCamera; frame?: SceneReferenceFrame },
) {
  return collectTrackableMapObjectHitTargets({
    layers,
    viewportWidthPx: W,
    viewportHeightPx: H,
    camera: options?.camera ?? IDENTITY_SCENE_CAMERA,
    frame: options?.frame ?? EARTH_FIXED_SCENE_REFERENCE_FRAME,
  });
}

describe("LIB-091 trackable hit-target collection", () => {
  it("emits stable moon, sun, and iss identities from rendered payloads", () => {
    const hits = collect([
      layer("moon", "points", moonPayload(20, 10)),
      layer("sun", "points", sunPayload(-40, -5)),
      layer("iss", "tracks", issPayload(0, 13)),
    ]);
    expect(new Set(hits.map((h) => h.target))).toEqual(new Set(["moon", "sun", "iss"]));
  });

  it("places Sun hit centers on the same scene coordinates as the painted glyph", () => {
    const lonDeg = 30;
    const latDeg = 12;
    const hits = collect([layer("sun", "points", sunPayload(lonDeg, latDeg))]);
    const plan = buildSubsolarMarkerRenderPlan({
      viewportWidthPx: W,
      viewportHeightPx: H,
      lonDeg,
      latDeg,
    });
    const glows = plan.items.filter((item) => item.kind === "radialGradientFill");
    expect(hits.length).toBeGreaterThan(0);
    expect(glows.length).toBe(hits.length);
    for (let i = 0; i < hits.length; i++) {
      const glow = glows[i]!;
      expect(hits[i]!.target).toBe("sun");
      expect(hits[i]!.sceneX).toBeCloseTo(glow.clipCx, 8);
      expect(hits[i]!.sceneY).toBeCloseTo(glow.clipCy, 8);
    }
  });

  it("agrees with ISS glyph copies under wrap, zoom, and pan", () => {
    const payload = issPayload(170, 20);
    const cam = camera({ scale: 2, centerU: 0.15, centerV: 0.45 });
    const copies = collectIssCurrentGlyphCopies({
      viewportWidthPx: W,
      viewportHeightPx: H,
      camera: cam,
      payload,
    });
    const hits = collect([layer("iss", "tracks", payload)], { camera: cam });
    expect(hits.map((h) => h.target)).toEqual(copies.map(() => "iss"));
    expect(hits).toHaveLength(copies.length);
    for (let i = 0; i < copies.length; i++) {
      expect(hits[i]!.sceneX).toBeCloseTo(copies[i]!.sceneX, 8);
      expect(hits[i]!.sceneY).toBeCloseTo(copies[i]!.sceneY, 8);
    }
  });

  it("keeps wrapped copies on one physical target id", () => {
    const cam = camera({ scale: 1, centerU: 0, centerV: 0.5 });
    const hits = collect([layer("moon", "points", moonPayload(0, 0))], {
      camera: cam,
    });
    expect(hits.length).toBeGreaterThan(1);
    expect(hits.every((h) => h.target === "moon")).toBe(true);
    const xs = new Set(hits.map((h) => h.sceneX));
    expect(xs.size).toBe(hits.length);
  });

  it("matches glyph centers under longitude-lock and position-lock", () => {
    const lonDeg = 40;
    const latDeg = 18;
    const frames = [
      moonLongitudeLockedSceneReferenceFrame(lonDeg),
      moonPositionLockedSceneReferenceFrame(lonDeg, latDeg),
      sunLongitudeLockedSceneReferenceFrame(lonDeg),
      sunPositionLockedSceneReferenceFrame(lonDeg, latDeg),
    ];
    for (const frame of frames) {
      const hits = collect([layer("sun", "points", sunPayload(lonDeg, latDeg))], { frame });
      const plan = buildSubsolarMarkerRenderPlan({
        viewportWidthPx: W,
        viewportHeightPx: H,
        lonDeg,
        latDeg,
        frame,
      });
      const glow = plan.items.find((item) => item.kind === "radialGradientFill");
      expect(glow).toBeDefined();
      expect(hits[0]!.sceneX).toBeCloseTo(glow!.clipCx, 8);
      expect(hits[0]!.sceneY).toBeCloseTo(glow!.clipCy, 8);
    }
  });

  it("omits hidden layers and earthquake point features", () => {
    const hiddenMoon = collect([layer("moon", "points", moonPayload(0, 0), false)]);
    expect(hiddenMoon).toEqual([]);
    const quakes = collect([
      layer("eq", "points", {
        kind: DYNAMIC_POINT_FEATURES_KIND,
        features: [{ id: "eq-1", lonDeg: 0, latDeg: 0, magnitude: 5 }],
      }),
    ]);
    expect(quakes).toEqual([]);
  });

  it("emits city pin and current-planet hit targets from painted payloads, not earthquakes", () => {
    const font = DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID;
    const cityPayload: CityPinsPayload = {
      kind: CITY_PINS_KIND,
      cities: [
        {
          id: "city.london",
          name: "London",
          latDeg: 51.5074,
          lonDeg: -0.1278,
          localTimeLabel: "12:00",
        },
      ],
      showLabels: true,
      labelMode: "city",
      scale: "medium",
      cityNameFontAssetId: font,
      dateTimeFontAssetId: font,
    };
    const planetPayload: PlanetaryObjectsPayload = {
      kind: PLANETARY_OBJECTS_KIND,
      supported: true,
      presentation: DEFAULT_PLANETARY_OBJECTS_PRESENTATION,
      bodies: [
        {
          id: "jupiter",
          displayName: "Jupiter",
          color: "#c9a36a",
          current: { lonDeg: 40, latDeg: 12 },
          trackPast: [],
          trackFuture: [],
          locus: [],
          showCurrent: true,
          showLabel: false,
          showTrack: false,
          showLocus: false,
        },
      ],
    };
    const hits = collect([
      layer("cities", "points", cityPayload),
      layer("planets", "points", planetPayload),
    ]);
    expect(hits.some((hit) => trackableMapObjectIdEquals(hit.target, cityTrackableMapObjectId("city.london")))).toBe(
      true,
    );
    expect(
      hits.some((hit) => trackableMapObjectIdEquals(hit.target, planetTrackableMapObjectId("jupiter"))),
    ).toBe(true);
    const catalog = collectTrackableTargetCatalog([
      layer("cities", "points", cityPayload),
      layer("planets", "points", planetPayload),
    ]);
    expect(catalog.cities).toEqual([
      { id: "city.london", name: "London", lonDeg: -0.1278, latDeg: 51.5074 },
    ]);
    expect(catalog.planets).toEqual([
      { id: "jupiter", displayName: "Jupiter", lonDeg: 40, latDeg: 12 },
    ]);
    expect(catalog.milkyWayPoints).toEqual([]);
  });
});
