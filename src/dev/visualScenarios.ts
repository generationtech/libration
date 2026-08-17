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

import { applyEclipseAlignmentPresentationToScene, applyEclipseInfoPresentationToScene, applyLayerEnableFlagsToScene, applyLunarEclipsePresentationToScene, applySolarEclipsePresentationToScene, applySublunarMarkerAppearanceToScene } from "../config/v2/sceneConfig";
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
  setVisualScenarioPreparedTracks,
  setVisualScenarioRuntime,
  type VisualScenarioRuntime,
} from "./visualScenarioRuntime";
import {
  ISS_PRESENTATION_SCENARIO_UTC,
  buildIssPresentationPreparedTracksView,
} from "./issPresentationScenario";
import "./visualScenarioBanner.css";

export const VISUAL_SCENARIO_IDS = [
  "baseline",
  "terminator",
  "night",
  "readability",
  "lunar-track",
  "lunar-locus",
  "moon-libration",
  "iss-presentation",
  "solar-eclipse-total",
  "solar-eclipse-annular",
  "solar-eclipse-partial",
  "solar-eclipse-dateline",
  "solar-eclipse-2017",
  "solar-eclipse-forecast",
  "solar-eclipse-forecast-annular",
  "solar-eclipse-forecast-partial",
  "solar-eclipse-forecast-multiple",
  "lunar-eclipse-total",
  "lunar-eclipse-partial",
  "lunar-eclipse-horizon",
  "lunar-eclipse-forecast-total",
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
  "iss-presentation": ISS_PRESENTATION_SCENARIO_UTC,
  "solar-eclipse-total": "2024-04-08T18:17:15.000Z",
  "solar-eclipse-annular": "2023-10-14T17:59:27.300Z",
  "solar-eclipse-partial": "2022-10-25T11:00:06.900Z",
  "solar-eclipse-dateline": "2016-03-09T01:57:09.400Z",
  "solar-eclipse-2017": "2017-08-21T18:25:29.700Z",
  "solar-eclipse-forecast": "2024-04-03T18:00:00.000Z",
  "solar-eclipse-forecast-annular": "2023-10-09T18:00:00.000Z",
  "solar-eclipse-forecast-partial": "2022-10-20T11:00:00.000Z",
  "solar-eclipse-forecast-multiple": "2023-10-01T00:00:00.000Z",
  "lunar-eclipse-total": "2022-05-16T04:11:29.000Z",
  "lunar-eclipse-partial": "2008-08-16T21:10:06.000Z",
  "lunar-eclipse-horizon": "2015-04-04T12:00:15.000Z",
  "lunar-eclipse-forecast-total": "2022-05-13T04:00:00.000Z",
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

/**
 * DEV-only 2022-05-16 total lunar eclipse stations for Moon-shadow / moonlight inspection.
 * Production does not import this map. Catalog contacts (symmetric about GE 04:11:29Z):
 * P1 01:32:08Z, U1 02:27:53Z, U2 03:29:02Z, U3 04:53:56Z, U4 05:55:05Z, P4 06:50:50Z.
 */
export const LUNAR_ECLIPSE_2022_PHASE_UTC = {
  pre: "2022-05-16T01:20:00.000Z",
  penumbral: "2022-05-16T02:00:00.000Z",
  partial: "2022-05-16T02:50:00.000Z",
  nearTotal: "2022-05-16T03:25:00.000Z",
  total: "2022-05-16T04:11:29.000Z",
  egress: "2022-05-16T05:20:00.000Z",
} as const;

export type LunarEclipsePhaseId = keyof typeof LUNAR_ECLIPSE_2022_PHASE_UTC;

/**
 * DEV-only 2017-08-21 total solar eclipse lifecycle stations.
 * Product UTCs (Knoxville EDT = UTC−4 wall labels in the originating playback):
 * upcoming 14:51Z, pre-central 15:56Z, early central 16:58Z, GE 18:25:29.700Z,
 * late central 18:48:44Z, post-central 20:21Z, after 21:10Z.
 * Visual-semantics A–F (Knoxville EDT captures): 14:42:59Z, 15:56:19Z, 17:05:58Z,
 * 17:52:57Z, 18:36:03Z, 19:55:15Z (`eclipseStation=stationA`…`stationF`).
 * Raster-boundary diagnostic stations (LIB-028): 15:39:02Z, 16:45:01Z, 17:06:33Z,
 * 19:22:59Z, 19:56:08Z (`rasterPreStart`…`rasterLate`).
 * Horizon/illumination stations (LIB-029): 14:30:00Z, 16:33:24Z, 17:10:15Z,
 * 19:22:26Z, 19:55:32Z (`horizonA`…`horizonE`) plus west 14:20–14:45Z and
 * east 19:40–20:05Z time steps.
 * Authority: global 15:46:43.920Z–20:58:49.700Z; central on Earth 16:49:13.920Z–20:01:43.920Z.
 * Production does not import this map.
 */
export const SOLAR_ECLIPSE_2017_STATION_UTC = {
  upcoming: "2017-08-21T14:51:00.000Z",
  preCentral: "2017-08-21T15:56:00.000Z",
  earlyCentral: "2017-08-21T16:58:00.000Z",
  ge: "2017-08-21T18:25:29.700Z",
  lateCentral: "2017-08-21T18:48:44.000Z",
  postCentral: "2017-08-21T20:21:00.000Z",
  after: "2017-08-21T21:10:00.000Z",
  /** Knoxville-captured visual-semantics sequence (EDT = UTC−4). Do not replace. */
  stationA: "2017-08-21T14:42:59.000Z",
  stationB: "2017-08-21T15:56:19.000Z",
  stationC: "2017-08-21T17:05:58.000Z",
  stationD: "2017-08-21T17:52:57.000Z",
  stationE: "2017-08-21T18:36:03.000Z",
  stationF: "2017-08-21T19:55:15.000Z",
  /** LIB-028 raster-boundary diagnostic times (Knoxville wall clock in the originating playback). */
  rasterPreStart: "2017-08-21T15:39:02.000Z",
  rasterWest: "2017-08-21T16:45:01.000Z",
  rasterMid: "2017-08-21T17:06:33.000Z",
  rasterEast: "2017-08-21T19:22:59.000Z",
  rasterLate: "2017-08-21T19:56:08.000Z",
  /** LIB-029 horizon/illumination Knoxville wall-clock stations (EDT = UTC−4). */
  horizonA: "2017-08-21T14:30:00.000Z",
  horizonB: "2017-08-21T16:33:24.000Z",
  horizonC: "2017-08-21T17:10:15.000Z",
  horizonD: "2017-08-21T19:22:26.000Z",
  horizonE: "2017-08-21T19:55:32.000Z",
  horizonWest1420: "2017-08-21T14:20:00.000Z",
  horizonWest1425: "2017-08-21T14:25:00.000Z",
  horizonWest1435: "2017-08-21T14:35:00.000Z",
  horizonWest1440: "2017-08-21T14:40:00.000Z",
  horizonWest1445: "2017-08-21T14:45:00.000Z",
  horizonEast1940: "2017-08-21T19:40:00.000Z",
  horizonEast1945: "2017-08-21T19:45:00.000Z",
  horizonEast1950: "2017-08-21T19:50:00.000Z",
  horizonEast1955: "2017-08-21T19:55:00.000Z",
  horizonEast2000: "2017-08-21T20:00:00.000Z",
  horizonEast2005: "2017-08-21T20:05:00.000Z",
} as const;

export type SolarEclipse2017StationId = keyof typeof SOLAR_ECLIPSE_2017_STATION_UTC;

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
  "iss-presentation": {
    id: "iss-presentation",
    startIsoUtc: VISUAL_SCENARIO_UTC["iss-presentation"],
    purpose:
      "DEV-only ISS overlay from a recorded TLE at a frozen UTC so Space objects presentation controls can be exercised without CelesTrak. Not a production live fallback.",
    buildConfig: () => withDemoAt(VISUAL_SCENARIO_UTC["iss-presentation"], applyIssPresentationScene),
  },
  "solar-eclipse-total": {
    id: "solar-eclipse-total",
    startIsoUtc: VISUAL_SCENARIO_UTC["solar-eclipse-total"],
    purpose:
      "Production solar eclipse overlay at 2024 Apr 08 greatest eclipse (total), including the live alignment beam.",
    buildConfig: () =>
      withDemoAt(VISUAL_SCENARIO_UTC["solar-eclipse-total"], applySolarEclipseLiveScene),
  },
  "solar-eclipse-annular": {
    id: "solar-eclipse-annular",
    startIsoUtc: VISUAL_SCENARIO_UTC["solar-eclipse-annular"],
    purpose: "Production solar eclipse overlay at 2023 Oct 14 greatest eclipse (annular).",
    buildConfig: () =>
      withDemoAt(VISUAL_SCENARIO_UTC["solar-eclipse-annular"], applySolarEclipseLiveScene),
  },
  "solar-eclipse-partial": {
    id: "solar-eclipse-partial",
    startIsoUtc: VISUAL_SCENARIO_UTC["solar-eclipse-partial"],
    purpose: "Production solar eclipse overlay at 2022 Oct 25 greatest eclipse (partial-only).",
    buildConfig: () =>
      withDemoAt(VISUAL_SCENARIO_UTC["solar-eclipse-partial"], applySolarEclipseLiveScene),
  },
  "solar-eclipse-dateline": {
    id: "solar-eclipse-dateline",
    startIsoUtc: VISUAL_SCENARIO_UTC["solar-eclipse-dateline"],
    purpose: "Production solar eclipse overlay at 2016 Mar 09 (Pacific / dateline-adjacent total).",
    buildConfig: () =>
      withDemoAt(VISUAL_SCENARIO_UTC["solar-eclipse-dateline"], applySolarEclipseLiveScene),
  },
  "solar-eclipse-2017": {
    id: "solar-eclipse-2017",
    startIsoUtc: VISUAL_SCENARIO_UTC["solar-eclipse-2017"],
    purpose:
      "2017 Aug 21 total solar eclipse lifecycle (7-day horizon). Default GE; optional DEV eclipseStation. Showcase: Extra Large Moon, Event labels off, Dramatic alignment, Large ground marker.",
    buildConfig: () =>
      withDemoAt(VISUAL_SCENARIO_UTC["solar-eclipse-2017"], applySolarEclipse2017Scene),
  },
  "solar-eclipse-forecast": {
    id: "solar-eclipse-forecast",
    startIsoUtc: VISUAL_SCENARIO_UTC["solar-eclipse-forecast"],
    purpose:
      "Upcoming 2024 Apr 08 total solar eclipse five days before greatest eclipse (7-day forecast horizon).",
    buildConfig: () =>
      withDemoAt(VISUAL_SCENARIO_UTC["solar-eclipse-forecast"], applySolarEclipseForecastScene),
  },
  "solar-eclipse-forecast-annular": {
    id: "solar-eclipse-forecast-annular",
    startIsoUtc: VISUAL_SCENARIO_UTC["solar-eclipse-forecast-annular"],
    purpose: "Upcoming 2023 Oct 14 annular solar eclipse five days before greatest eclipse.",
    buildConfig: () =>
      withDemoAt(
        VISUAL_SCENARIO_UTC["solar-eclipse-forecast-annular"],
        applySolarEclipseForecastScene,
      ),
  },
  "solar-eclipse-forecast-partial": {
    id: "solar-eclipse-forecast-partial",
    startIsoUtc: VISUAL_SCENARIO_UTC["solar-eclipse-forecast-partial"],
    purpose: "Upcoming 2022 Oct 25 partial-only solar eclipse (no fabricated central corridor).",
    buildConfig: () =>
      withDemoAt(
        VISUAL_SCENARIO_UTC["solar-eclipse-forecast-partial"],
        applySolarEclipseForecastScene,
      ),
  },
  "solar-eclipse-forecast-multiple": {
    id: "solar-eclipse-forecast-multiple",
    startIsoUtc: VISUAL_SCENARIO_UTC["solar-eclipse-forecast-multiple"],
    purpose: "365-day forecast horizon containing more than one upcoming solar eclipse.",
    buildConfig: () =>
      withDemoAt(VISUAL_SCENARIO_UTC["solar-eclipse-forecast-multiple"], (draft) => {
        applySolarEclipseForecastScene(draft, 365);
      }),
  },
  "lunar-eclipse-total": {
    id: "lunar-eclipse-total",
    startIsoUtc: VISUAL_SCENARIO_UTC["lunar-eclipse-total"],
    purpose: "Production lunar eclipse overlay at NASA 2022 May 16 greatest eclipse (total).",
    buildConfig: () =>
      withDemoAt(VISUAL_SCENARIO_UTC["lunar-eclipse-total"], applyLunarEclipseLiveScene),
  },
  "lunar-eclipse-partial": {
    id: "lunar-eclipse-partial",
    startIsoUtc: VISUAL_SCENARIO_UTC["lunar-eclipse-partial"],
    purpose: "Production lunar eclipse overlay at NASA 2008 Aug 16 greatest eclipse (partial).",
    buildConfig: () =>
      withDemoAt(VISUAL_SCENARIO_UTC["lunar-eclipse-partial"], applyLunarEclipseLiveScene),
  },
  "lunar-eclipse-horizon": {
    id: "lunar-eclipse-horizon",
    startIsoUtc: VISUAL_SCENARIO_UTC["lunar-eclipse-horizon"],
    purpose:
      "Production lunar eclipse overlay at NASA 2015 Apr 04 greatest eclipse (dateline zenith).",
    buildConfig: () =>
      withDemoAt(VISUAL_SCENARIO_UTC["lunar-eclipse-horizon"], applyLunarEclipseLiveScene),
  },
  "lunar-eclipse-forecast-total": {
    id: "lunar-eclipse-forecast-total",
    startIsoUtc: VISUAL_SCENARIO_UTC["lunar-eclipse-forecast-total"],
    purpose:
      "Upcoming 2022 May 16 total lunar eclipse three days before greatest eclipse (7-day forecast horizon).",
    buildConfig: () =>
      withDemoAt(
        VISUAL_SCENARIO_UTC["lunar-eclipse-forecast-total"],
        applyLunarEclipseForecastScene,
      ),
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

function applyIssPresentationScene(draft: LibrationConfigV2): void {
  draft.layers.solarShading = true;
  draft.layers.grid = true;
  draft.layers.orbitalTracks = true;
  draft.layers.cityPins = false;
  draft.layers.solarAnalemma = false;
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

function applySolarEclipseLiveScene(draft: LibrationConfigV2): void {
  applySolarEclipseScene(draft);
  if (draft.scene) {
    draft.scene = applySolarEclipsePresentationToScene(draft.scene, { forecastHorizonDays: 0 });
  }
}

function applySolarEclipseForecastScene(
  draft: LibrationConfigV2,
  forecastHorizonDays: 7 | 365 = 7,
): void {
  applySolarEclipseScene(draft);
  if (draft.scene) {
    draft.scene = applySolarEclipsePresentationToScene(draft.scene, { forecastHorizonDays });
  }
}

function applySolarEclipse2017Scene(draft: LibrationConfigV2): void {
  applySolarEclipseForecastScene(draft, 7);
  if (!draft.scene) {
    return;
  }
  draft.scene = applySublunarMarkerAppearanceToScene(draft.scene, { size: "extraLarge" });
  draft.scene = applySolarEclipsePresentationToScene(draft.scene, {
    liveGroundPositionSize: "large",
  });
  draft.scene = applyEclipseAlignmentPresentationToScene(draft.scene, { intensity: "dramatic" });
  draft.scene = applyEclipseInfoPresentationToScene(draft.scene, { labelsEnabled: false });
}

function applyLunarEclipseLiveScene(draft: LibrationConfigV2): void {
  draft.layers.solarShading = true;
  draft.layers.grid = true;
  draft.layers.lunarEclipse = true;
  draft.layers.subsolarMarker = true;
  draft.layers.sublunarMarker = true;
  draft.layers.lunarGroundTrack = false;
  draft.layers.lunarLocus = false;
  draft.layers.solarAnalemma = false;
  draft.layers.cityPins = true;
}

function applyLunarEclipseForecastScene(
  draft: LibrationConfigV2,
  forecastHorizonDays: 0 | 1 | 3 | 7 | 14 | 30 | 90 | 365 = 7,
): void {
  applyLunarEclipseLiveScene(draft);
  if (draft.scene) {
    draft.scene = applyLunarEclipsePresentationToScene(draft.scene, { forecastHorizonDays });
  }
}

function parseForecastHorizonDays(
  raw: string | null,
): 0 | 1 | 3 | 7 | 14 | 30 | 90 | 365 | null {
  if (raw === null || raw === "") {
    return null;
  }
  const n = Number(raw);
  if (n === 0 || n === 1 || n === 3 || n === 7 || n === 14 || n === 30 || n === 90 || n === 365) {
    return n;
  }
  return null;
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

export function parseLunarEclipsePhaseId(raw: string | null): LunarEclipsePhaseId | null {
  if (raw && raw in LUNAR_ECLIPSE_2022_PHASE_UTC) {
    return raw as LunarEclipsePhaseId;
  }
  return null;
}

export function parseSolarEclipse2017StationId(raw: string | null): SolarEclipse2017StationId | null {
  if (raw && raw in SOLAR_ECLIPSE_2017_STATION_UTC) {
    return raw as SolarEclipse2017StationId;
  }
  return null;
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
  if (requested === "solar-eclipse-2017") {
    const params = parseSearchParams(input.search);
    const station = parseSolarEclipse2017StationId(params.get("eclipseStation"));
    const startIsoUtc = SOLAR_ECLIPSE_2017_STATION_UTC[station ?? "ge"];
    const eclipseObserver = parseMoonLibrationObserverCityId(params.get("observerCity"));
    const horizonDays = parseForecastHorizonDays(params.get("horizon"));
    const config = withDemoAt(startIsoUtc, applySolarEclipse2017Scene);
    const topBandAnchor =
      eclipseObserver === "none"
        ? ({ mode: "auto" } as const)
        : eclipseObserver !== null
          ? ({ mode: "fixedCity", cityId: eclipseObserver } as const)
          : config.chrome.displayTime.topBandAnchor;
    let scene = config.scene;
    if (scene && horizonDays !== null) {
      scene = applySolarEclipsePresentationToScene(scene, { forecastHorizonDays: horizonDays });
    }
    return {
      kind: "applied",
      id: "solar-eclipse-2017",
      startIsoUtc,
      config: {
        ...config,
        ...(scene ? { scene } : {}),
        chrome: {
          ...config.chrome,
          displayTime: {
            ...config.chrome.displayTime,
            topBandAnchor,
          },
        },
      },
    };
  }
  const definition = VISUAL_SCENARIOS[requested];
  const searchParams = parseSearchParams(input.search);
  const eclipseObserver =
    requested.startsWith("solar-eclipse-") || requested.startsWith("lunar-eclipse-")
      ? parseMoonLibrationObserverCityId(searchParams.get("observerCity"))
      : null;
  const horizonDays =
    requested.startsWith("solar-eclipse-") || requested.startsWith("lunar-eclipse-")
      ? parseForecastHorizonDays(searchParams.get("horizon"))
      : null;
  const eclipsePhase =
    requested === "lunar-eclipse-total" ? parseLunarEclipsePhaseId(searchParams.get("eclipsePhase")) : null;
  if (eclipseObserver !== null || horizonDays !== null || eclipsePhase !== null) {
    const startIsoUtc = eclipsePhase
      ? LUNAR_ECLIPSE_2022_PHASE_UTC[eclipsePhase]
      : definition.startIsoUtc;
    const config = eclipsePhase
      ? withDemoAt(startIsoUtc, applyLunarEclipseLiveScene)
      : definition.buildConfig();
    const topBandAnchor =
      eclipseObserver === "none"
        ? ({ mode: "auto" } as const)
        : eclipseObserver !== null
          ? ({ mode: "fixedCity", cityId: eclipseObserver } as const)
          : config.chrome.displayTime.topBandAnchor;
    let scene = config.scene;
    if (scene && horizonDays !== null) {
      scene = requested.startsWith("lunar-eclipse-")
        ? applyLunarEclipsePresentationToScene(scene, { forecastHorizonDays: horizonDays })
        : applySolarEclipsePresentationToScene(scene, { forecastHorizonDays: horizonDays });
    }
    return {
      kind: "applied",
      id: definition.id,
      startIsoUtc,
      config: {
        ...config,
        ...(scene ? { scene } : {}),
        chrome: {
          ...config.chrome,
          displayTime: {
            ...config.chrome.displayTime,
            topBandAnchor,
          },
        },
      },
    };
  }
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
  setVisualScenarioPreparedTracks(
    session.kind === "applied" && session.id === "iss-presentation"
      ? buildIssPresentationPreparedTracksView()
      : null,
  );
  if (session.kind === "unknown") {
    console.error(
      `[libration] Unknown visual scenario "${session.requestedId}". Ordinary startup; the requested scenario was not applied.`,
    );
  }
  return session;
}
