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

import { applyLayerEnableFlagsToScene, applySublunarMarkerAppearanceToScene } from "../config/v2/sceneConfig";
import {
  assertIsNormalizedLibrationConfig,
  defaultLibrationConfigV2,
  normalizeLibrationConfig,
  type LibrationConfigV2,
} from "../config/v2/librationConfig";
import { setWorkingV2PersistenceSuppressed } from "../config/v2/workingV2Persistence";
import { LUNAR_LOCUS_EPOCH_UTC, type LunarLocusEpochId } from "../core/lunarLocus";
import { REFERENCE_CITIES } from "../data/referenceCities";
import {
  setVisualScenarioExtraOverlayBuilder,
  setVisualScenarioRuntime,
  type VisualScenarioRuntime,
} from "./visualScenarioRuntime";
import "./visualScenarioBanner.css";

export const VISUAL_SCENARIO_IDS = [
  "baseline",
  "terminator",
  "night",
  "readability",
  "lunar-track",
  "lunar-locus",
  "moon-libration",
  "solar-eclipse-total",
  "solar-eclipse-annular",
  "solar-eclipse-partial",
  "solar-eclipse-dateline",
] as const;

export type VisualScenarioId = (typeof VISUAL_SCENARIO_IDS)[number];

export const VISUAL_SCENARIO_UTC = {
  baseline: "2030-06-15T12:00:00.000Z",
  terminator: "2026-03-20T12:00:00.000Z",
  night: "2026-12-21T06:00:00.000Z",
  readability: "2026-06-21T12:00:00.000Z",
  "lunar-track": "2026-01-16T22:00:00.000Z",
  "lunar-locus": LUNAR_LOCUS_EPOCH_UTC.recent,
  "moon-libration": "2021-12-10T00:00:00.000Z",
  "solar-eclipse-total": "2024-04-08T18:17:15.000Z",
  "solar-eclipse-annular": "2023-10-14T17:59:27.300Z",
  "solar-eclipse-partial": "2022-10-25T11:00:06.900Z",
  "solar-eclipse-dateline": "2016-03-09T01:57:09.400Z",
} as const satisfies Record<VisualScenarioId, string>;

/** DEV-only paused instants for Moon libration visual checks. Production does not import this map. */
export const MOON_LIBRATION_EPOCH_UTC = {
  diagonal: "2021-12-10T00:00:00.000Z",
  zero: "2021-08-03T00:00:00.000Z",
  lonEast: "2023-01-28T00:00:00.000Z",
  lonWest: "2020-04-01T00:00:00.000Z",
  latNorth: "2022-09-08T00:00:00.000Z",
  latSouth: "2020-07-25T00:00:00.000Z",
  new: "2021-07-10T00:00:00.000Z",
  quarter: "2022-10-03T00:00:00.000Z",
  full: "2021-09-21T00:00:00.000Z",
} as const;

export type MoonLibrationEpochId = keyof typeof MOON_LIBRATION_EPOCH_UTC;

/** Chromatic Köppen–Geiger substrate used by the readability scenario. */
export const READABILITY_BASE_MAP_ID = "equirect-world-climate-koppen-beck-v1";

export type VisualScenarioDefinition = {
  readonly id: VisualScenarioId;
  readonly startIsoUtc: string;
  readonly purpose: string;
  readonly buildConfig: () => LibrationConfigV2;
};

export type ResolveVisualScenarioInput = {
  readonly isDev: boolean;
  readonly search: string;
};

function isolateFromLiveNetworkData(draft: LibrationConfigV2): void {
  draft.layers.globalCloudsIr = false;
  draft.layers.earthquakes = false;
  draft.layers.orbitalTracks = false;
  const scene = draft.scene;
  if (!scene) {
    return;
  }
  draft.scene = {
    ...scene,
    illumination: {
      ...scene.illumination,
      cloudParticipation: {
        ...scene.illumination.cloudParticipation,
        mode: "off",
      },
    },
  };
}

function withDemoAt(
  startIsoUtc: string,
  mutate?: (draft: LibrationConfigV2) => void,
): LibrationConfigV2 {
  const draft = defaultLibrationConfigV2();
  draft.data = {
    ...draft.data,
    mode: "demo",
    demoTime: {
      ...draft.data.demoTime,
      enabled: true,
      startIsoUtc,
    },
  };
  isolateFromLiveNetworkData(draft);
  mutate?.(draft);
  if (!draft.scene) {
    throw new Error("visual scenario: default config is missing scene");
  }
  draft.scene = applyLayerEnableFlagsToScene(draft.scene, draft.layers);
  const normalized = normalizeLibrationConfig(draft);
  assertIsNormalizedLibrationConfig(normalized);
  return normalized;
}

export const VISUAL_SCENARIOS: Record<VisualScenarioId, VisualScenarioDefinition> = {
  baseline: {
    id: "baseline",
    startIsoUtc: VISUAL_SCENARIO_UTC.baseline,
    purpose:
      "Representative default scene: layout, map composition, chrome, ordinary overlays.",
    buildConfig: () => withDemoAt(VISUAL_SCENARIO_UTC.baseline),
  },
  terminator: {
    id: "terminator",
    startIsoUtc: VISUAL_SCENARIO_UTC.terminator,
    purpose:
      "Equinox 12:00 UTC so the solar terminator and twilight are geographically prominent.",
    buildConfig: () =>
      withDemoAt(VISUAL_SCENARIO_UTC.terminator, (draft) => {
        draft.layers.solarShading = true;
      }),
  },
  night: {
    id: "night",
    startIsoUtc: VISUAL_SCENARIO_UTC.night,
    purpose:
      "Winter-solstice 06:00 UTC (subsolar near 90°E) with the Americas in night so emissive lights and dark-side composition are visible.",
    buildConfig: () =>
      withDemoAt(VISUAL_SCENARIO_UTC.night, (draft) => {
        draft.layers.solarShading = true;
      }),
  },
  readability: {
    id: "readability",
    startIsoUtc: VISUAL_SCENARIO_UTC.readability,
    purpose:
      "Dense overlays on a chromatic climate substrate for label, contrast, and chrome/scene interaction checks.",
    buildConfig: () =>
      withDemoAt(VISUAL_SCENARIO_UTC.readability, (draft) => {
        draft.layers.grid = true;
        draft.layers.cityPins = true;
        draft.layers.subsolarMarker = true;
        draft.layers.sublunarMarker = true;
        draft.layers.solarShading = true;
        draft.layers.solarAnalemma = true;
        if (draft.scene) {
          draft.scene = {
            ...draft.scene,
            baseMap: {
              ...draft.scene.baseMap,
              id: READABILITY_BASE_MAP_ID,
            },
          };
        }
      }),
  },
  "lunar-track": {
    id: "lunar-track",
    startIsoUtc: VISUAL_SCENARIO_UTC["lunar-track"],
    purpose:
      "Sublunar ground track with past and future extents, Moon marker on, analemma off, for seam and alignment checks.",
    buildConfig: () =>
      withDemoAt(VISUAL_SCENARIO_UTC["lunar-track"], (draft) => {
        draft.layers.solarShading = true;
        draft.layers.grid = true;
        draft.layers.sublunarMarker = true;
        draft.layers.lunarGroundTrack = true;
        draft.layers.solarAnalemma = false;
        draft.layers.cityPins = false;
      }),
  },
  "lunar-locus": {
    id: "lunar-locus",
    startIsoUtc: VISUAL_SCENARIO_UTC["lunar-locus"],
    purpose:
      "Production lunar locus overlay: Moon marker on, locus on, ground track off, analemma off.",
    buildConfig: () => withDemoAt(VISUAL_SCENARIO_UTC["lunar-locus"], applyLunarLocusScene),
  },
  "moon-libration": {
    id: "moon-libration",
    startIsoUtc: VISUAL_SCENARIO_UTC["moon-libration"],
    purpose:
      "Production Moon glyph with optical-libration ring; observer-oriented by default. Optional DEV librationEpoch, observerCity, librationOrientation, librationStyle.",
    buildConfig: () => withDemoAt(VISUAL_SCENARIO_UTC["moon-libration"], applyMoonLibrationScene),
  },
  "solar-eclipse-total": {
    id: "solar-eclipse-total",
    startIsoUtc: VISUAL_SCENARIO_UTC["solar-eclipse-total"],
    purpose: "Production solar eclipse overlay at 2024 Apr 08 greatest eclipse (total).",
    buildConfig: () =>
      withDemoAt(VISUAL_SCENARIO_UTC["solar-eclipse-total"], applySolarEclipseScene),
  },
  "solar-eclipse-annular": {
    id: "solar-eclipse-annular",
    startIsoUtc: VISUAL_SCENARIO_UTC["solar-eclipse-annular"],
    purpose: "Production solar eclipse overlay at 2023 Oct 14 greatest eclipse (annular).",
    buildConfig: () =>
      withDemoAt(VISUAL_SCENARIO_UTC["solar-eclipse-annular"], applySolarEclipseScene),
  },
  "solar-eclipse-partial": {
    id: "solar-eclipse-partial",
    startIsoUtc: VISUAL_SCENARIO_UTC["solar-eclipse-partial"],
    purpose: "Production solar eclipse overlay at 2022 Oct 25 greatest eclipse (partial-only).",
    buildConfig: () =>
      withDemoAt(VISUAL_SCENARIO_UTC["solar-eclipse-partial"], applySolarEclipseScene),
  },
  "solar-eclipse-dateline": {
    id: "solar-eclipse-dateline",
    startIsoUtc: VISUAL_SCENARIO_UTC["solar-eclipse-dateline"],
    purpose: "Production solar eclipse overlay at 2016 Mar 09 (Pacific / dateline-adjacent total).",
    buildConfig: () =>
      withDemoAt(VISUAL_SCENARIO_UTC["solar-eclipse-dateline"], applySolarEclipseScene),
  },
};

function applyLunarLocusScene(draft: LibrationConfigV2): void {
  draft.layers.solarShading = true;
  draft.layers.grid = true;
  draft.layers.sublunarMarker = true;
  draft.layers.lunarGroundTrack = false;
  draft.layers.lunarLocus = true;
  draft.layers.solarAnalemma = false;
  draft.layers.cityPins = false;
}

function applyMoonLibrationScene(draft: LibrationConfigV2): void {
  draft.layers.solarShading = true;
  draft.layers.grid = true;
  draft.layers.sublunarMarker = true;
  draft.layers.lunarGroundTrack = false;
  draft.layers.lunarLocus = false;
  draft.layers.solarAnalemma = false;
  draft.layers.cityPins = false;
}

function applySolarEclipseScene(draft: LibrationConfigV2): void {
  draft.layers.solarShading = true;
  draft.layers.grid = true;
  draft.layers.solarEclipse = true;
  draft.layers.subsolarMarker = true;
  draft.layers.sublunarMarker = true;
  draft.layers.lunarGroundTrack = false;
  draft.layers.lunarLocus = false;
  draft.layers.solarAnalemma = false;
  draft.layers.cityPins = false;
}

function parseSearchParams(search: string): URLSearchParams {
  const trimmed = search.startsWith("?") ? search.slice(1) : search;
  return new URLSearchParams(trimmed);
}

export function parseLunarLocusEpochId(raw: string | null): LunarLocusEpochId {
  if (raw === "standstill" || raw === "minor" || raw === "baseline" || raw === "recent") {
    return raw;
  }
  return "recent";
}

export function parseMoonLibrationEpochId(raw: string | null): MoonLibrationEpochId {
  if (raw && raw in MOON_LIBRATION_EPOCH_UTC) {
    return raw as MoonLibrationEpochId;
  }
  return "diagonal";
}

/** DEV-only: catalog city id, or `none` to clear the reference-city observer. */
export function parseMoonLibrationObserverCityId(raw: string | null): "none" | string | null {
  if (raw === null || raw === "") {
    return null;
  }
  if (raw === "none") {
    return "none";
  }
  const direct = raw.startsWith("city.") ? raw : `city.${raw}`;
  const hyphen = direct.replace(/-/g, "_");
  if (REFERENCE_CITIES.some((c) => c.id === direct)) {
    return direct;
  }
  if (REFERENCE_CITIES.some((c) => c.id === hyphen)) {
    return hyphen;
  }
  return null;
}

export function isVisualScenarioId(id: string): id is VisualScenarioId {
  return (VISUAL_SCENARIO_IDS as readonly string[]).includes(id);
}

/**
 * Parse `?scenario=<id>` from a location search string.
 * Returns `null` when the parameter is absent (ordinary startup).
 */
export function parseVisualScenarioQuery(search: string): string | null {
  const trimmed = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(trimmed);
  if (!params.has("scenario")) {
    return null;
  }
  return params.get("scenario") ?? "";
}

/**
 * Pure resolver: DEV + known id → applied fixture; DEV + unknown/empty id → unknown;
 * non-DEV or absent param → inactive. Never silently substitutes another scenario.
 */
export function resolveVisualScenarioSession(
  input: ResolveVisualScenarioInput,
): VisualScenarioRuntime {
  if (!input.isDev) {
    return { kind: "inactive" };
  }
  const requested = parseVisualScenarioQuery(input.search);
  if (requested === null) {
    return { kind: "inactive" };
  }
  if (!isVisualScenarioId(requested)) {
    return { kind: "unknown", requestedId: requested };
  }
  if (requested === "lunar-locus") {
    const params = parseSearchParams(input.search);
    const epoch = parseLunarLocusEpochId(params.get("locusEpoch"));
    const startIsoUtc = LUNAR_LOCUS_EPOCH_UTC[epoch];
    return {
      kind: "applied",
      id: "lunar-locus",
      startIsoUtc,
      config: withDemoAt(startIsoUtc, applyLunarLocusScene),
    };
  }
  if (requested === "moon-libration") {
    const params = parseSearchParams(input.search);
    const epoch = parseMoonLibrationEpochId(params.get("librationEpoch"));
    const startIsoUtc = MOON_LIBRATION_EPOCH_UTC[epoch];
    const observerCity = parseMoonLibrationObserverCityId(params.get("observerCity"));
    const orientationRaw = params.get("librationOrientation");
    const styleRaw = params.get("librationStyle");
    return {
      kind: "applied",
      id: "moon-libration",
      startIsoUtc,
      config: withDemoAt(startIsoUtc, (draft) => {
        applyMoonLibrationScene(draft);
        if (observerCity === "none") {
          draft.chrome = {
            ...draft.chrome,
            displayTime: {
              ...draft.chrome.displayTime,
              topBandAnchor: { mode: "auto" },
            },
          };
        } else if (observerCity !== null) {
          draft.chrome = {
            ...draft.chrome,
            displayTime: {
              ...draft.chrome.displayTime,
              topBandAnchor: { mode: "fixedCity", cityId: observerCity },
            },
          };
        }
        if (
          draft.scene &&
          (orientationRaw === "map" ||
            orientationRaw === "observer" ||
            styleRaw === "ring" ||
            styleRaw === "crosshair")
        ) {
          draft.scene = applySublunarMarkerAppearanceToScene(draft.scene, {
            ...(orientationRaw === "map" || orientationRaw === "observer"
              ? { librationOrientation: orientationRaw }
              : {}),
            ...(styleRaw === "ring" || styleRaw === "crosshair"
              ? { librationStyle: styleRaw }
              : {}),
          });
        }
      }),
    };
  }
  const definition = VISUAL_SCENARIOS[requested];
  return {
    kind: "applied",
    id: definition.id,
    startIsoUtc: definition.startIsoUtc,
    config: definition.buildConfig(),
  };
}

/**
 * Apply the current location query as the process-local visual-scenario session.
 * Call once at DEV bootstrap, before mounting `<App />`.
 */
export function applyVisualScenarioFromLocation(search: string): VisualScenarioRuntime {
  const session = resolveVisualScenarioSession({
    isDev: import.meta.env.DEV,
    search,
  });
  setVisualScenarioRuntime(session);
  setWorkingV2PersistenceSuppressed(session.kind === "applied");
  setVisualScenarioExtraOverlayBuilder(null);
  if (session.kind === "unknown") {
    console.error(
      `[libration] Unknown visual scenario "${session.requestedId}". Ordinary startup; the requested scenario was not applied.`,
    );
  }
  return session;
}
