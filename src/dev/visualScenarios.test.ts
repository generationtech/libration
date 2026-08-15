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

import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_DEMO_TIME_START_ISO_UTC } from "../config/appConfig";
import { assertIsNormalizedLibrationConfig } from "../config/v2/librationConfig";
import {
  persistWorkingV2,
  resolveStartupWorkingV2,
  setWorkingV2PersistenceSuppressed,
  WORKING_V2_LOCAL_STORAGE_KEY,
} from "../config/v2/workingV2Persistence";
import mainSource from "../main.tsx?raw";
import {
  READABILITY_BASE_MAP_ID,
  VISUAL_SCENARIO_IDS,
  VISUAL_SCENARIO_UTC,
  VISUAL_SCENARIOS,
  MOON_LIBRATION_EPOCH_UTC,
  applyVisualScenarioFromLocation,
  parseVisualScenarioQuery,
  resolveVisualScenarioSession,
} from "./visualScenarios";
import {
  getVisualScenarioRuntime,
  getVisualScenarioExtraOverlayLayer,
  resetVisualScenarioRuntime,
} from "./visualScenarioRuntime";

function makeMemoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => {
      m.clear();
    },
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => {
      m.delete(k);
    },
    setItem: (k, v) => {
      m.set(k, v);
    },
  } as Storage;
}

afterEach(() => {
  resetVisualScenarioRuntime();
  setWorkingV2PersistenceSuppressed(false);
  vi.restoreAllMocks();
});

describe("visual scenario query parsing", () => {
  it("returns null when the parameter is absent", () => {
    expect(parseVisualScenarioQuery("")).toBeNull();
    expect(parseVisualScenarioQuery("?foo=bar")).toBeNull();
  });

  it("returns the requested id, including empty", () => {
    expect(parseVisualScenarioQuery("?scenario=baseline")).toBe("baseline");
    expect(parseVisualScenarioQuery("scenario=night")).toBe("night");
    expect(parseVisualScenarioQuery("?scenario=")).toBe("");
  });
});

describe("resolveVisualScenarioSession", () => {
  it("is inactive when not in development, even with a known id", () => {
    const session = resolveVisualScenarioSession({
      isDev: false,
      search: "?scenario=baseline",
    });
    expect(session).toEqual({ kind: "inactive" });
  });

  it("is inactive for ordinary startup in development", () => {
    expect(resolveVisualScenarioSession({ isDev: true, search: "" })).toEqual({
      kind: "inactive",
    });
    expect(
      resolveVisualScenarioSession({ isDev: true, search: "?foo=1" }),
    ).toEqual({ kind: "inactive" });
  });

  it("does not silently substitute an unknown or empty id", () => {
    expect(
      resolveVisualScenarioSession({ isDev: true, search: "?scenario=not-a-scene" }),
    ).toEqual({ kind: "unknown", requestedId: "not-a-scene" });
    expect(
      resolveVisualScenarioSession({ isDev: true, search: "?scenario=" }),
    ).toEqual({ kind: "unknown", requestedId: "" });
    expect(
      resolveVisualScenarioSession({ isDev: true, search: "?scenario=BASELINE" }),
    ).toEqual({ kind: "unknown", requestedId: "BASELINE" });
  });

  it("resolves each canonical scenario to a normalized demo fixture", () => {
    for (const id of VISUAL_SCENARIO_IDS) {
      const session = resolveVisualScenarioSession({
        isDev: true,
        search: `?scenario=${id}`,
      });
      expect(session.kind).toBe("applied");
      if (session.kind !== "applied") {
        continue;
      }
      expect(session.id).toBe(id);
      expect(session.startIsoUtc).toBe(VISUAL_SCENARIO_UTC[id]);
      assertIsNormalizedLibrationConfig(session.config);
      expect(session.config.data.mode).toBe("demo");
      expect(session.config.data.demoTime.enabled).toBe(true);
      expect(session.config.data.demoTime.startIsoUtc).toBe(VISUAL_SCENARIO_UTC[id]);
      expect(session.config.layers.globalCloudsIr).toBe(false);
      expect(session.config.layers.earthquakes).toBe(false);
      expect(session.config.layers.orbitalTracks).toBe(false);
      expect(session.config.scene?.illumination.cloudParticipation.mode).toBe("off");
    }
  });

  it("uses factory defaults plus paused demo time for baseline", () => {
    const config = VISUAL_SCENARIOS.baseline.buildConfig();
    expect(config.data.demoTime.startIsoUtc).toBe(DEFAULT_DEMO_TIME_START_ISO_UTC);
    expect(config.layers.solarShading).toBe(true);
    expect(config.layers.grid).toBe(true);
    expect(config.layers.cityPins).toBe(true);
    expect(config.layers.solarAnalemma).toBe(false);
    expect(config.layers.lunarGroundTrack).toBe(false);
  });

  it("keeps solar shading on for terminator and night", () => {
    expect(VISUAL_SCENARIOS.terminator.buildConfig().layers.solarShading).toBe(true);
    expect(VISUAL_SCENARIOS.night.buildConfig().layers.solarShading).toBe(true);
  });

  it("selects the Köppen climate substrate and analemma for readability", () => {
    const config = VISUAL_SCENARIOS.readability.buildConfig();
    expect(config.scene?.baseMap.id).toBe(READABILITY_BASE_MAP_ID);
    expect(config.layers.solarAnalemma).toBe(true);
    expect(config.layers.grid).toBe(true);
    expect(config.layers.cityPins).toBe(true);
  });

  it("enables the lunar ground track with the Moon marker and without the analemma", () => {
    const config = VISUAL_SCENARIOS["lunar-track"].buildConfig();
    expect(config.layers.lunarGroundTrack).toBe(true);
    expect(config.layers.sublunarMarker).toBe(true);
    expect(config.layers.solarAnalemma).toBe(false);
    expect(config.data.demoTime.startIsoUtc).toBe(VISUAL_SCENARIO_UTC["lunar-track"]);
    const row = config.scene?.layers.find((l) => l.id === "lunarGroundTrack");
    expect(row?.enabled).toBe(true);
    expect(row?.source.kind === "derived" ? row.source.parameters?.pastHours : undefined).toBe(24);
    expect(row?.source.kind === "derived" ? row.source.parameters?.futureHours : undefined).toBe(24);
    expect(row?.source.kind === "derived" ? row.source.parameters?.pastColor : undefined).toBe("#aacdf0");
    expect(row?.source.kind === "derived" ? row.source.parameters?.futureColor : undefined).toBe("#aacdf0");
  });

  it("seeds moon-libration with the production Moon glyph and libration on by default", () => {
    const config = VISUAL_SCENARIOS["moon-libration"].buildConfig();
    expect(config.layers.sublunarMarker).toBe(true);
    expect(config.layers.lunarLocus).toBe(false);
    expect(config.layers.solarAnalemma).toBe(false);
    expect(config.layers.cityPins).toBe(false);
    expect(config.data.demoTime.startIsoUtc).toBe(VISUAL_SCENARIO_UTC["moon-libration"]);
    const row = config.scene?.layers.find((l) => l.id === "sublunarMarker");
    expect(row?.source.kind === "derived" ? row.source.parameters?.librationEnabled : undefined).toBe(true);
    expect(row?.source.kind === "derived" ? row.source.parameters?.librationStyle : undefined).toBe("ring");
  });

  it("selects moon-libration epoch UTC from the DEV librationEpoch query parameter", () => {
    const zero = resolveVisualScenarioSession({
      isDev: true,
      search: "?scenario=moon-libration&librationEpoch=zero",
    });
    expect(zero.kind).toBe("applied");
    if (zero.kind === "applied") {
      expect(zero.startIsoUtc).toBe(MOON_LIBRATION_EPOCH_UTC.zero);
    }
    const full = resolveVisualScenarioSession({
      isDev: true,
      search: "?scenario=moon-libration&librationEpoch=full",
    });
    expect(full.kind).toBe("applied");
    if (full.kind === "applied") {
      expect(full.startIsoUtc).toBe(MOON_LIBRATION_EPOCH_UTC.full);
    }
  });

  it("seeds lunar-locus with the production overlay, Moon marker, track off, and analemma off", () => {
    const config = VISUAL_SCENARIOS["lunar-locus"].buildConfig();
    expect(config.layers.sublunarMarker).toBe(true);
    expect(config.layers.lunarLocus).toBe(true);
    expect(config.layers.lunarGroundTrack).toBe(false);
    expect(config.layers.solarAnalemma).toBe(false);
    expect(config.layers.grid).toBe(true);
    expect(config.layers.cityPins).toBe(false);
    expect(config.data.demoTime.startIsoUtc).toBe(VISUAL_SCENARIO_UTC["lunar-locus"]);
  });

  it("selects lunar-locus epoch UTC from the DEV locusEpoch query parameter", () => {
    const standstill = resolveVisualScenarioSession({
      isDev: true,
      search: "?scenario=lunar-locus&locusEpoch=standstill",
    });
    expect(standstill.kind).toBe("applied");
    if (standstill.kind === "applied") {
      expect(standstill.startIsoUtc).toBe("2025-03-08T12:00:00.000Z");
      expect(standstill.config.data.demoTime.startIsoUtc).toBe("2025-03-08T12:00:00.000Z");
    }
    const minor = resolveVisualScenarioSession({
      isDev: true,
      search: "?scenario=lunar-locus&locusEpoch=minor",
    });
    expect(minor.kind).toBe("applied");
    if (minor.kind === "applied") {
      expect(minor.startIsoUtc).toBe("2015-09-16T12:00:00.000Z");
      expect(minor.config.layers.lunarLocus).toBe(true);
    }
  });
});

describe("applyVisualScenarioFromLocation", () => {
  it("applies a known scenario and suppresses persistence", () => {
    const session = applyVisualScenarioFromLocation("?scenario=terminator");
    expect(session.kind).toBe("applied");
    expect(getVisualScenarioRuntime()).toEqual(session);
    const mem = makeMemoryStorage();
    const mutated = VISUAL_SCENARIOS.baseline.buildConfig();
    persistWorkingV2(mem, mutated);
    expect(mem.getItem(WORKING_V2_LOCAL_STORAGE_KEY)).toBeNull();
  });

  it("does not suppress persistence for an unknown scenario", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const session = applyVisualScenarioFromLocation("?scenario=missing");
    expect(session).toEqual({ kind: "unknown", requestedId: "missing" });
    expect(err).toHaveBeenCalled();
    const mem = makeMemoryStorage();
    persistWorkingV2(mem, VISUAL_SCENARIOS.baseline.buildConfig());
    expect(mem.getItem(WORKING_V2_LOCAL_STORAGE_KEY)).not.toBeNull();
  });

  it("does not install an experiment extra overlay for lunar-locus", () => {
    const session = applyVisualScenarioFromLocation("?scenario=lunar-locus");
    expect(session.kind).toBe("applied");
    expect(
      getVisualScenarioExtraOverlayLayer({
        utcMs: Date.parse(VISUAL_SCENARIO_UTC["lunar-locus"]),
        viewportWidthPx: 1920,
        viewportHeightPx: 1080,
        layers: [],
      }),
    ).toBeNull();
  });
});

describe("persistence isolation at the startup boundary", () => {
  it("ignores stored working config when seeding from an applied scenario", () => {
    const mem = makeMemoryStorage();
    const stored = VISUAL_SCENARIOS.readability.buildConfig();
    persistWorkingV2(mem, stored);
    expect(mem.getItem(WORKING_V2_LOCAL_STORAGE_KEY)).not.toBeNull();

    const session = resolveVisualScenarioSession({
      isDev: true,
      search: "?scenario=baseline",
    });
    expect(session.kind).toBe("applied");
    if (session.kind !== "applied") {
      return;
    }
    const started = resolveStartupWorkingV2(null, () => session.config);
    expect(started.data.demoTime.startIsoUtc).toBe(VISUAL_SCENARIO_UTC.baseline);
    expect(started.scene?.baseMap.id).not.toBe(READABILITY_BASE_MAP_ID);
    expect(mem.getItem(WORKING_V2_LOCAL_STORAGE_KEY)).not.toBeNull();
  });

  it("ordinary startup still loads persisted configuration", () => {
    const session = resolveVisualScenarioSession({ isDev: true, search: "" });
    expect(session.kind).toBe("inactive");
    const mem = makeMemoryStorage();
    const stored = VISUAL_SCENARIOS.night.buildConfig();
    persistWorkingV2(mem, stored);
    const started = resolveStartupWorkingV2(mem, () =>
      VISUAL_SCENARIOS.baseline.buildConfig(),
    );
    expect(started.data.demoTime.startIsoUtc).toBe(VISUAL_SCENARIO_UTC.night);
  });
});

describe("development-only containment in the entry point", () => {
  it("loads the scenario registry only inside an import.meta.env.DEV branch", () => {
    expect(mainSource).toMatch(/import\.meta\.env\.DEV/);
    expect(mainSource).toMatch(/dev\/visualScenarios/);
    const devIdx = mainSource.indexOf("import.meta.env.DEV");
    const importIdx = mainSource.indexOf("dev/visualScenarios");
    expect(devIdx).toBeGreaterThanOrEqual(0);
    expect(importIdx).toBeGreaterThan(devIdx);
    expect(mainSource).not.toMatch(/lunarLocusExperiment/);
    expect(mainSource).not.toMatch(/dev\/lunarLocusPlan/);
  });
});
