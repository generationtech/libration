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

import { applyLayerEnableFlagsToScene } from "../config/v2/sceneConfig";
import {
  assertIsNormalizedLibrationConfig,
  defaultLibrationConfigV2,
  normalizeLibrationConfig,
  type LibrationConfigV2,
} from "../config/v2/librationConfig";
import { setWorkingV2PersistenceSuppressed } from "../config/v2/workingV2Persistence";
import {
  LUNAR_LOCUS_EPOCH_UTC,
  type LunarLocusEpochId,
  type LunarLocusMode,
  type LunarLocusTreatment,
} from "./lunarLocusExperiment";
import { buildLunarLocusRenderPlan } from "./lunarLocusPlan";
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
] as const;

export type VisualScenarioId = (typeof VISUAL_SCENARIO_IDS)[number];

export const VISUAL_SCENARIO_UTC = {
  baseline: "2030-06-15T12:00:00.000Z",
  terminator: "2026-03-20T12:00:00.000Z",
  night: "2026-12-21T06:00:00.000Z",
  readability: "2026-06-21T12:00:00.000Z",
  "lunar-track": "2026-01-16T22:00:00.000Z",
  "lunar-locus": LUNAR_LOCUS_EPOCH_UTC.recent,
} as const satisfies Record<VisualScenarioId, string>;

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
      "Development-only lunar-day locus experiment: Moon marker on, ground track off, analemma off.",
    buildConfig: () => withDemoAt(VISUAL_SCENARIO_UTC["lunar-locus"], applyLunarLocusScene),
  },
};

function applyLunarLocusScene(draft: LibrationConfigV2): void {
  draft.layers.solarShading = true;
  draft.layers.grid = true;
  draft.layers.sublunarMarker = true;
  draft.layers.lunarGroundTrack = false;
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

export function parseLunarLocusMode(raw: string | null): LunarLocusMode {
  if (raw === "geographic" || raw === "residual" || raw === "glyph") {
    return raw;
  }
  return "glyph";
}

export function parseLunarLocusTreatment(raw: string | null): LunarLocusTreatment {
  if (raw === "dots" || raw === "dots-line") {
    return raw;
  }
  return "dots";
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
  if (session.kind === "applied" && session.id === "lunar-locus") {
    const params = parseSearchParams(search);
    const mode = parseLunarLocusMode(params.get("locusMode"));
    const treatment = parseLunarLocusTreatment(params.get("locusTreatment"));
    setVisualScenarioExtraOverlayBuilder(({ utcMs, viewportWidthPx, viewportHeightPx }) =>
      buildLunarLocusRenderPlan({
        utcMs,
        viewportWidthPx,
        viewportHeightPx,
        mode,
        treatment,
      }),
    );
  }
  if (session.kind === "unknown") {
    console.error(
      `[libration] Unknown visual scenario "${session.requestedId}". Ordinary startup; the requested scenario was not applied.`,
    );
  }
  return session;
}
