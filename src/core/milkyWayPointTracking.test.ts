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
import { DYNAMIC_POINT_FEATURES_KIND } from "../layers/dynamicPointFeaturesPayload";
import { MILKY_WAY_KIND, type MilkyWayPayload } from "../layers/milkyWayPayload";
import { DEFAULT_MILKY_WAY_PRESENTATION } from "./milkyWayPresentation";
import {
  sampleMilkyWayGeometry,
  type MilkyWayGeometry,
  type MilkyWayTaggedPoint,
} from "./milkyWayGeometry";
import {
  collectTrackableTargetCatalog,
  trackableAuthoritativeMapsFromCatalog,
  trackableTargetAvailabilityFromCatalog,
} from "../renderer/trackableTargetCatalog";
import { collectTrackableMapObjectHitTargets } from "../renderer/trackableMapObjectHitTargets";
import { milkyWayPointGlyphRadiusPx } from "../renderer/renderPlan/milkyWayPlan";
import type { RenderableLayerState } from "../renderer/types";
import {
  IDENTITY_SCENE_CAMERA,
  clampSceneCamera,
  minimumScaleToCoverSceneFrameEarth,
  sceneCameraVerticalExtentFromFrame,
  sceneXFromLongitudeDeg,
  sceneYFromLatitudeDeg,
  type SceneCamera,
} from "./sceneCamera";
import { nextAnchorContinuousLonDeg } from "./sceneFrameAnchor";
import {
  EARTH_FIXED_SCENE_REFERENCE_FRAME,
  anchoredSceneReferenceFrame,
  canonicalLonLatToSceneFrame,
} from "./sceneReferenceFrame";
import {
  applyTrackableMapObjectClick,
  collectWrappedPointGlyphCopies,
  pickTrackableMapObjectHit,
  trackableMapObjectHitRadiusPx,
} from "./trackableMapObjectHit";
import {
  cityTrackableMapObjectId,
  isTrackableMapObjectId,
  milkyWayPointTrackableMapObjectId,
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

const INSTANT = Date.UTC(2026, 7, 19, 6, 0, 0);
const W = 800;
const H = 400;
const NAMED_AVAILABLE = { moon: true, sun: true, iss: true } as const;
const GC_ID = milkyWayPointTrackableMapObjectId("galacticCenter");
const GAC_ID = milkyWayPointTrackableMapObjectId("galacticAnticenter");

function pt(latDeg: number, lonDeg: number, night = true, lDeg = 0): MilkyWayTaggedPoint {
  return { latDeg, lonDeg, night, lDeg };
}

function geometry(partial: Partial<MilkyWayGeometry> = {}): MilkyWayGeometry {
  return {
    plane: [pt(10, 170, true, 0), pt(12, 176, true, 2), pt(11, -178, false, 4)],
    northEdge: [pt(20, 170, true), pt(22, 176, true)],
    southEdge: [pt(0, 170, true), pt(2, 176, true)],
    ribs: [{ lDeg: 0, points: [pt(0, 170, true), pt(10, 170, true), pt(20, 170, true)] }],
    galacticCenter: pt(-28.9, 120.5, true, 0),
    galacticAnticenter: pt(28.9, -59.5, false, 180),
    ...partial,
  };
}

function milkyWayPayload(partial: Partial<MilkyWayPayload> = {}): MilkyWayPayload {
  return {
    kind: MILKY_WAY_KIND,
    supported: true,
    presentation: {
      ...DEFAULT_MILKY_WAY_PRESENTATION,
      galacticAnticenterEnabled: true,
    },
    geometry: geometry(),
    visibility: null,
    eventLabel: null,
    ...partial,
  };
}

function layer(
  id: string,
  data: unknown,
  visible = true,
): RenderableLayerState {
  return {
    id,
    name: id,
    type: "vector",
    zIndex: 1,
    visible,
    opacity: 1,
    data,
  };
}

function camera(partial: Partial<SceneCamera>): SceneCamera {
  return clampSceneCamera({ ...IDENTITY_SCENE_CAMERA, ...partial });
}

describe("LIB-093 galactic point tracking identities", () => {
  it("keeps Galactic Center and Anticenter distinct, reconstructed-equal, and not a synthetic Milky Way target", () => {
    expect(trackableMapObjectIdEquals(GC_ID, { kind: "milkyWayPoint", id: "galacticCenter" })).toBe(
      true,
    );
    expect(trackableMapObjectIdEquals(GC_ID, GAC_ID)).toBe(false);
    expect(trackableMapObjectIdEquals(GC_ID, "moon")).toBe(false);
    expect(trackableMapObjectIdEquals(GC_ID, planetTrackableMapObjectId("jupiter"))).toBe(false);
    expect(isTrackableMapObjectId("milkyWay")).toBe(false);
    expect(isTrackableMapObjectId({ kind: "milkyWayPoint", id: "milkyWay" })).toBe(false);
  });

  it("round-trips native-select keys for both galactic points", () => {
    for (const target of [GC_ID, GAC_ID] as const) {
      const key = trackingTargetSelectValue(target);
      const parsed = tryParseTrackingTargetSelectValue(key);
      expect(parsed.ok).toBe(true);
      if (parsed.ok) {
        expect(trackableMapObjectIdEquals(parsed.target, target)).toBe(true);
      }
    }
    expect(trackingTargetSelectValue(GC_ID)).toBe("milkyway:galacticCenter");
    expect(trackingTargetSelectValue(GAC_ID)).toBe("milkyway:galacticAnticenter");
    expect(tryParseTrackingTargetSelectValue("milkyway").ok).toBe(false);
    expect(tryParseTrackingTargetSelectValue("milkyWay").ok).toBe(false);
    expect(tryParseTrackingTargetSelectValue("milkyway:milkyWay").ok).toBe(false);
  });

  it("groups Galactic Center and Anticenter under Celestial with no synthetic Milky Way option", () => {
    const model = trackingTargetSelectModel(
      {
        cities: [{ id: "city.london", name: "London" }],
        planets: [{ id: "jupiter", displayName: "Jupiter" }],
        milkyWayPoints: [
          { id: "galacticCenter", label: "Galactic Center" },
          { id: "galacticAnticenter", label: "Galactic Anticenter" },
        ],
      },
      { moon: true, sun: true, iss: true },
    );
    expect(model.groups.map((group) => group.label)).toEqual([
      "Celestial",
      "Spacecraft",
      "Cities",
    ]);
    expect(model.groups[0]!.options.map((option) => option.label)).toEqual([
      "Moon",
      "Sun",
      "Jupiter",
      "Galactic Center",
      "Galactic Anticenter",
    ]);
    expect(model.groups.some((group) => group.label === "Milky Way")).toBe(false);
    const labels = [
      ...model.ungrouped.map((option) => option.label),
      ...model.groups.flatMap((group) => group.options.map((option) => option.label)),
    ];
    expect(labels).not.toContain("Milky Way");
  });
});

describe("LIB-093 galactic point resolution", () => {
  const sampled = sampleMilkyWayGeometry(INSTANT, "normal")!;
  const catalogLayers = [
    layer(
      "mw",
      milkyWayPayload({
        geometry: sampled,
        presentation: {
          ...DEFAULT_MILKY_WAY_PRESENTATION,
          galacticAnticenterEnabled: true,
        },
      }),
    ),
  ];
  const catalog = collectTrackableTargetCatalog(catalogLayers);
  const maps = trackableAuthoritativeMapsFromCatalog(catalog);
  const state = {
    moon: { lonDeg: 10, latDeg: 5 },
    sun: { lonDeg: 20, latDeg: -8 },
    iss: null,
    milkyWayPoints: maps.milkyWayPoints,
  };

  it("resolves lon/lat from the same Milky Way geometry payload used to paint", () => {
    expect(catalog.milkyWayPoints.map((point) => point.id)).toEqual([
      "galacticCenter",
      "galacticAnticenter",
    ]);
    expect(resolveTrackableMapObject(GC_ID, state)).toEqual({
      lonDeg: sampled.galacticCenter!.lonDeg,
      latDeg: sampled.galacticCenter!.latDeg,
    });
    expect(resolveTrackableMapObject(GAC_ID, state)).toEqual({
      lonDeg: sampled.galacticAnticenter!.lonDeg,
      latDeg: sampled.galacticAnticenter!.latDeg,
    });
  });

  it("omits a galactic point that is not rendered rather than fabricating a position", () => {
    const centerOnly = collectTrackableTargetCatalog([
      layer("mw", milkyWayPayload({ presentation: DEFAULT_MILKY_WAY_PRESENTATION })),
    ]);
    expect(centerOnly.milkyWayPoints.map((point) => point.id)).toEqual(["galacticCenter"]);
    expect(
      collectTrackableTargetCatalog([
        layer("mw", milkyWayPayload({ supported: false, geometry: null })),
      ]).milkyWayPoints,
    ).toEqual([]);
    expect(
      collectTrackableTargetCatalog([layer("mw", milkyWayPayload(), false)]).milkyWayPoints,
    ).toEqual([]);
    expect(resolveTrackableMapObject(GAC_ID, { moon: state.moon, sun: state.sun, iss: null })).toBeNull();
  });

  it("falls unavailable galactic selection back to Earth-fixed and keeps mode", () => {
    const available = trackableTargetAvailabilityFromCatalog(catalog, false);
    const tracked = setTrackingTarget(
      { target: null, rememberedMode: "longitude" },
      GC_ID,
      available,
    );
    expect(trackableMapObjectIdEquals(tracked.target, GC_ID)).toBe(true);
    expect(
      applyTrackingTargetAvailability(tracked, {
        ...available,
        milkyWayPoints: new Set(),
      }),
    ).toEqual({ target: null, rememberedMode: "longitude" });
  });
});

describe("LIB-093 galactic point anchored-frame semantics", () => {
  const gc = { lonDeg: 120.5, latDeg: -28.9 };
  const gac = { lonDeg: -59.5, latDeg: 28.9 };

  it("longitude-locks Galactic Center to the frame meridian with physical latitude", () => {
    const frame = anchoredSceneReferenceFrame({
      target: GC_ID,
      lockMode: "longitude",
      continuousAnchorLonDeg: gc.lonDeg,
      anchorLatDeg: gc.latDeg,
    });
    const scene = canonicalLonLatToSceneFrame(gc, frame);
    expect(scene.sceneLonDeg).toBeCloseTo(0, 10);
    expect(scene.sceneLatDeg).toBeCloseTo(gc.latDeg, 10);
  });

  it("position-locks Galactic Center to the scene origin", () => {
    const frame = anchoredSceneReferenceFrame({
      target: GC_ID,
      lockMode: "position",
      continuousAnchorLonDeg: gc.lonDeg,
      anchorLatDeg: gc.latDeg,
    });
    const scene = canonicalLonLatToSceneFrame(gc, frame);
    expect(scene.sceneLonDeg).toBeCloseTo(0, 10);
    expect(scene.sceneLatDeg).toBeCloseTo(0, 10);
  });

  it("longitude-locks and position-locks Galactic Anticenter the same generic way", () => {
    const lon = anchoredSceneReferenceFrame({
      target: GAC_ID,
      lockMode: "longitude",
      continuousAnchorLonDeg: gac.lonDeg,
      anchorLatDeg: gac.latDeg,
    });
    const pos = anchoredSceneReferenceFrame({
      target: GAC_ID,
      lockMode: "position",
      continuousAnchorLonDeg: gac.lonDeg,
      anchorLatDeg: gac.latDeg,
    });
    expect(canonicalLonLatToSceneFrame(gac, lon)).toMatchObject({
      sceneLonDeg: expect.closeTo(0, 10),
      sceneLatDeg: expect.closeTo(gac.latDeg, 10),
    });
    expect(canonicalLonLatToSceneFrame(gac, pos)).toMatchObject({
      sceneLonDeg: expect.closeTo(0, 10),
      sceneLatDeg: expect.closeTo(0, 10),
    });
  });

  it("reuses generic continuity around ±180° with no galactic-specific wrap path", () => {
    const followed = nextAnchorContinuousLonDeg({
      previousContinuousLonDeg: 179,
      nextCanonicalLonDeg: -179,
      policy: "follow",
    });
    expect(followed).toBe(181);
    expect(
      nextAnchorContinuousLonDeg({
        previousContinuousLonDeg: 179,
        nextCanonicalLonDeg: -179,
        policy: "follow",
      }),
    ).toBe(followed);
  });

  it("applies generic auto-cover from galactic-point latitude, equal to Moon at the same numeric anchor", () => {
    const gcFrame = anchoredSceneReferenceFrame({
      target: GC_ID,
      lockMode: "position",
      continuousAnchorLonDeg: gc.lonDeg,
      anchorLatDeg: gc.latDeg,
    });
    const moonSame = anchoredSceneReferenceFrame({
      target: "moon",
      lockMode: "position",
      continuousAnchorLonDeg: gc.lonDeg,
      anchorLatDeg: gc.latDeg,
    });
    const gacFrame = anchoredSceneReferenceFrame({
      target: GAC_ID,
      lockMode: "position",
      continuousAnchorLonDeg: gac.lonDeg,
      anchorLatDeg: gac.latDeg,
    });
    const moonGac = anchoredSceneReferenceFrame({
      target: "moon",
      lockMode: "position",
      continuousAnchorLonDeg: gac.lonDeg,
      anchorLatDeg: gac.latDeg,
    });
    expect(minimumScaleToCoverSceneFrameEarth(sceneCameraVerticalExtentFromFrame(gcFrame))).toBe(
      minimumScaleToCoverSceneFrameEarth(sceneCameraVerticalExtentFromFrame(moonSame)),
    );
    expect(minimumScaleToCoverSceneFrameEarth(sceneCameraVerticalExtentFromFrame(gacFrame))).toBe(
      minimumScaleToCoverSceneFrameEarth(sceneCameraVerticalExtentFromFrame(moonGac)),
    );
  });

  it("retains mode across galactic and other target switches", () => {
    const available = {
      ...NAMED_AVAILABLE,
      planets: new Set(["jupiter"] as const),
      milkyWayPoints: new Set(["galacticCenter", "galacticAnticenter"] as const),
    };
    const moonLon = setTrackingMode(
      setTrackingTarget({ target: null, rememberedMode: "position" }, "moon", available),
      "longitude",
    );
    expect(setTrackingTarget(moonLon, GC_ID, available)).toEqual({
      target: GC_ID,
      rememberedMode: "longitude",
    });
    expect(setTrackingTarget(setTrackingTarget(moonLon, GC_ID, available), GAC_ID, available)).toEqual(
      { target: GAC_ID, rememberedMode: "longitude" },
    );
    expect(
      setTrackingTarget(
        setTrackingTarget(moonLon, GC_ID, available),
        planetTrackableMapObjectId("jupiter"),
        available,
      ),
    ).toEqual({
      target: planetTrackableMapObjectId("jupiter"),
      rememberedMode: "longitude",
    });
  });

  it("orders overlap ties moon, sun, iss, planets, milky-way points, then cities", () => {
    const planetKey = trackableMapObjectIdTieKey(planetTrackableMapObjectId("jupiter"));
    const gcKey = trackableMapObjectIdTieKey(GC_ID);
    const gacKey = trackableMapObjectIdTieKey(GAC_ID);
    const cityKey = trackableMapObjectIdTieKey(cityTrackableMapObjectId("city.london"));
    expect(trackableMapObjectIdTieKey("iss") < planetKey).toBe(true);
    expect(planetKey < gcKey).toBe(true);
    expect(planetKey < gacKey).toBe(true);
    expect(gcKey).not.toBe(gacKey);
    expect(gcKey < cityKey).toBe(true);
    expect(gacKey < cityKey).toBe(true);
  });
});

describe("LIB-093 galactic point hit targets", () => {
  const payload = milkyWayPayload();
  const gc = payload.geometry!.galacticCenter!;

  it("places hit centers on the same scene mapping as the painted glyphs, including wrap", () => {
    const wrapPayload = milkyWayPayload({
      geometry: geometry({ galacticCenter: pt(0, 0, true, 0) }),
    });
    const cam = camera({ scale: 1, centerU: 0, centerV: 0.5 });
    const hits = collectTrackableMapObjectHitTargets({
      layers: [layer("mw", wrapPayload)],
      viewportWidthPx: W,
      viewportHeightPx: H,
      camera: cam,
      frame: EARTH_FIXED_SCENE_REFERENCE_FRAME,
    });
    const gcHits = hits.filter((hit) => trackableMapObjectIdEquals(hit.target, GC_ID));
    const gacHits = hits.filter((hit) => trackableMapObjectIdEquals(hit.target, GAC_ID));
    const gcCopies = collectWrappedPointGlyphCopies({
      lonDeg: 0,
      latDeg: 0,
      viewportWidthPx: W,
      viewportHeightPx: H,
      camera: cam,
      frame: EARTH_FIXED_SCENE_REFERENCE_FRAME,
      renderedRadiusPx: milkyWayPointGlyphRadiusPx(W, "center"),
      xClipRadiusMultiple: 4,
    });
    expect(gcHits.length).toBeGreaterThan(1);
    expect(gcHits).toHaveLength(gcCopies.length);
    expect(new Set(gcHits.map((hit) => JSON.stringify(hit.target))).size).toBe(1);
    for (let i = 0; i < gcCopies.length; i += 1) {
      expect(gcHits[i]!.sceneX).toBeCloseTo(gcCopies[i]!.sceneX, 8);
      expect(gcHits[i]!.sceneY).toBeCloseTo(gcCopies[i]!.sceneY, 8);
    }
    expect(gacHits.length).toBeGreaterThan(0);
    expect(gcHits[0]!.hitRadiusPx).toBe(
      trackableMapObjectHitRadiusPx(milkyWayPointGlyphRadiusPx(W, "center")),
    );
  });

  it("matches glyph centers under Earth-fixed, anchored frames, zoom, and pan", () => {
    const cases: {
      camera: SceneCamera;
      frame: ReturnType<typeof anchoredSceneReferenceFrame> | typeof EARTH_FIXED_SCENE_REFERENCE_FRAME;
    }[] = [
      { camera: IDENTITY_SCENE_CAMERA, frame: EARTH_FIXED_SCENE_REFERENCE_FRAME },
      {
        camera: IDENTITY_SCENE_CAMERA,
        frame: anchoredSceneReferenceFrame({
          target: GC_ID,
          lockMode: "longitude",
          continuousAnchorLonDeg: gc.lonDeg,
          anchorLatDeg: gc.latDeg,
        }),
      },
      {
        camera: IDENTITY_SCENE_CAMERA,
        frame: anchoredSceneReferenceFrame({
          target: GC_ID,
          lockMode: "position",
          continuousAnchorLonDeg: gc.lonDeg,
          anchorLatDeg: gc.latDeg,
        }),
      },
      {
        camera: camera({ scale: 2, centerU: 0.5, centerV: 0.5 }),
        frame: anchoredSceneReferenceFrame({
          target: GC_ID,
          lockMode: "position",
          continuousAnchorLonDeg: gc.lonDeg,
          anchorLatDeg: gc.latDeg,
        }),
      },
      {
        camera: camera({ scale: 1.5, centerU: 0.52, centerV: 0.52 }),
        frame: anchoredSceneReferenceFrame({
          target: GC_ID,
          lockMode: "position",
          continuousAnchorLonDeg: gc.lonDeg,
          anchorLatDeg: gc.latDeg,
        }),
      },
    ];
    for (const { camera: cam, frame } of cases) {
      const hits = collectTrackableMapObjectHitTargets({
        layers: [layer("mw", payload)],
        viewportWidthPx: W,
        viewportHeightPx: H,
        camera: cam,
        frame,
      });
      const hit = hits.find((row) => trackableMapObjectIdEquals(row.target, GC_ID));
      expect(hit).toBeDefined();
      expect(hit!.sceneX).toBeCloseTo(sceneXFromLongitudeDeg(gc.lonDeg, W, cam, frame), 8);
      expect(hit!.sceneY).toBeCloseTo(sceneYFromLatitudeDeg(gc.latDeg, H, cam, frame), 8);
    }
  });

  it("clicking a galactic point sets that target and retains mode; same-target click is a no-op", () => {
    const hits = collectTrackableMapObjectHitTargets({
      layers: [layer("mw", payload)],
      viewportWidthPx: W,
      viewportHeightPx: H,
      camera: IDENTITY_SCENE_CAMERA,
      frame: EARTH_FIXED_SCENE_REFERENCE_FRAME,
    });
    const available = {
      ...NAMED_AVAILABLE,
      milkyWayPoints: new Set(["galacticCenter", "galacticAnticenter"] as const),
    };
    const gcHit = hits.find((hit) => trackableMapObjectIdEquals(hit.target, GC_ID))!;
    const selected = applyTrackableMapObjectClick({
      current: { target: null, rememberedMode: "position" },
      hits,
      pointerX: gcHit.sceneX,
      pointerY: gcHit.sceneY,
      panBecameActive: false,
      available,
    });
    expect(trackableMapObjectIdEquals(selected.target, GC_ID)).toBe(true);
    expect(selected.rememberedMode).toBe("position");
    expect(
      applyTrackableMapObjectClick({
        current: selected,
        hits,
        pointerX: gcHit.sceneX,
        pointerY: gcHit.sceneY,
        panBecameActive: false,
        available,
      }),
    ).toEqual(selected);
    const gacHit = hits.find((hit) => trackableMapObjectIdEquals(hit.target, GAC_ID))!;
    const switched = applyTrackableMapObjectClick({
      current: { target: "sun", rememberedMode: "longitude" },
      hits,
      pointerX: gacHit.sceneX,
      pointerY: gacHit.sceneY,
      panBecameActive: false,
      available,
    });
    expect(trackableMapObjectIdEquals(switched.target, GAC_ID)).toBe(true);
    expect(switched.rememberedMode).toBe("longitude");
  });

  it("does not track a click on the galactic-plane band away from tagged points", () => {
    const hits = collectTrackableMapObjectHitTargets({
      layers: [layer("mw", payload)],
      viewportWidthPx: W,
      viewportHeightPx: H,
      camera: IDENTITY_SCENE_CAMERA,
      frame: EARTH_FIXED_SCENE_REFERENCE_FRAME,
    });
    const bandX = sceneXFromLongitudeDeg(176, W, IDENTITY_SCENE_CAMERA);
    const bandY = sceneYFromLatitudeDeg(12, H, IDENTITY_SCENE_CAMERA);
    expect(pickTrackableMapObjectHit(hits, bandX, bandY)).toBeNull();
    const current = { target: "moon" as const, rememberedMode: "position" as const };
    expect(
      applyTrackableMapObjectClick({
        current,
        hits,
        pointerX: bandX,
        pointerY: bandY,
        panBecameActive: false,
        available: {
          ...NAMED_AVAILABLE,
          milkyWayPoints: new Set(["galacticCenter", "galacticAnticenter"] as const),
        },
      }),
    ).toEqual(current);
  });

  it("keeps earthquakes non-trackable and uses generic overlap ties", () => {
    const quakeHits = collectTrackableMapObjectHitTargets({
      layers: [
        layer("eq", {
          kind: DYNAMIC_POINT_FEATURES_KIND,
          features: [{ id: "eq-1", lonDeg: gc.lonDeg, latDeg: gc.latDeg, magnitude: 5 }],
        }),
        layer("mw", payload),
      ],
      viewportWidthPx: W,
      viewportHeightPx: H,
      camera: IDENTITY_SCENE_CAMERA,
      frame: EARTH_FIXED_SCENE_REFERENCE_FRAME,
    });
    expect(
      quakeHits.every(
        (hit) =>
          trackableMapObjectIdEquals(hit.target, GC_ID) ||
          trackableMapObjectIdEquals(hit.target, GAC_ID),
      ),
    ).toBe(true);
    expect(
      pickTrackableMapObjectHit(
        [
          {
            target: planetTrackableMapObjectId("jupiter"),
            sceneX: 0,
            sceneY: 0,
            hitRadiusPx: 20,
          },
          { target: GC_ID, sceneX: 0, sceneY: 0, hitRadiusPx: 20 },
        ],
        0,
        0,
      )?.target,
    ).toEqual(planetTrackableMapObjectId("jupiter"));
  });
});
