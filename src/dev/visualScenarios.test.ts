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
  TWILIGHT_PRESENTATION_CASE_UTC,
  applyVisualScenarioFromLocation,
  parseVisualScenarioQuery,
  resolveVisualScenarioSession,
  parseMoonLibrationObserverCityId,
} from "./visualScenarios";
import {
  getVisualScenarioRuntime,
  getVisualScenarioExtraOverlayLayer,
  getDevCloudsSectorDebugTint,
  resetVisualScenarioRuntime,
  attachVisualScenarioPreparedEquirect,
  attachVisualScenarioPreparedPointFeatures,
  attachVisualScenarioPreparedTracks,
} from "./visualScenarioRuntime";
import {
  getActiveNightVeilTransferId,
  setDevNightVeilTransferOverride,
} from "../core/nightVeilFromSolarAltitude";

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
  setDevNightVeilTransferOverride(null);
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

  it("ordinary cloudsSectorDebug is not a visual scenario", () => {
    expect(parseVisualScenarioQuery("?cloudsSectorDebug=1")).toBeNull();
    const session = applyVisualScenarioFromLocation("?cloudsSectorDebug=1");
    expect(session.kind).toBe("inactive");
    expect(getDevCloudsSectorDebugTint()).not.toBeNull();
  });

  it("ordinary cloudsSectorDebug=signal and leak are not visual scenarios", () => {
    expect(parseVisualScenarioQuery("?cloudsSectorDebug=signal")).toBeNull();
    expect(applyVisualScenarioFromLocation("?cloudsSectorDebug=signal").kind).toBe(
      "inactive",
    );
    expect(getDevCloudsSectorDebugTint()).not.toBeNull();
    expect(parseVisualScenarioQuery("?cloudsSectorDebug=leak")).toBeNull();
    expect(applyVisualScenarioFromLocation("?cloudsSectorDebug=leak").kind).toBe(
      "inactive",
    );
    expect(getDevCloudsSectorDebugTint()).not.toBeNull();
  });

  it("does not enable Clouds sector debug under an applied scenario", () => {
    applyVisualScenarioFromLocation("?scenario=baseline&cloudsSectorDebug=1");
    expect(getDevCloudsSectorDebugTint()).toBeNull();
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

  it("does not isolate live layers unless a DEV scenario is applied", () => {
    const ordinary = resolveVisualScenarioSession({
      isDev: true,
      search: "",
    });
    expect(ordinary.kind).toBe("inactive");
    const applied = resolveVisualScenarioSession({
      isDev: true,
      search: "?scenario=baseline",
    });
    expect(applied.kind).toBe("applied");
    if (applied.kind !== "applied") return;
    expect(applied.config.layers.globalCloudsIr).toBe(false);
    expect(applied.config.layers.earthquakes).toBe(false);
    expect(applied.config.layers.orbitalTracks).toBe(false);
    expect(applied.config.scene?.illumination.cloudParticipation.mode).toBe("off");
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
      expect(session.config.layers.globalCloudsIr).toBe(id === "clouds");
      expect(session.config.layers.earthquakes).toBe(id === "earthquake-presentation");
      expect(session.config.layers.orbitalTracks).toBe(id === "iss-presentation");
      expect(session.config.layers.planetaryObjects).toBe(id === "planetary-objects");
      expect(session.config.layers.milkyWay).toBe(id === "milky-way");
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

  it("seeds twilight-presentation at the near-new-Moon Knoxville case by default", () => {
    const config = VISUAL_SCENARIOS["twilight-presentation"].buildConfig();
    expect(config.layers.solarShading).toBe(true);
    expect(config.data.demoTime.startIsoUtc).toBe(TWILIGHT_PRESENTATION_CASE_UTC.c);
    expect(config.chrome.displayTime.topBandAnchor).toEqual({
      mode: "fixedCity",
      cityId: "city.knoxville",
    });
  });

  it("selects documented twilightCase instants without adding extra scenario ids", () => {
    const a = resolveVisualScenarioSession({
      isDev: true,
      search: "?scenario=twilight-presentation&twilightCase=a",
    });
    const b = resolveVisualScenarioSession({
      isDev: true,
      search: "?scenario=twilight-presentation&twilightCase=b",
    });
    expect(a.kind).toBe("applied");
    expect(b.kind).toBe("applied");
    if (a.kind === "applied") {
      expect(a.startIsoUtc).toBe("2026-08-21T00:57:00.000Z");
      expect(a.config.data.demoTime.startIsoUtc).toBe("2026-08-21T00:57:00.000Z");
    }
    if (b.kind === "applied") {
      expect(b.startIsoUtc).toBe("2026-08-24T04:34:00.000Z");
    }
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

  it("enables ISS presentation scenario with orbitalTracks on and no other live feeds", () => {
    const config = VISUAL_SCENARIOS["iss-presentation"].buildConfig();
    expect(config.layers.orbitalTracks).toBe(true);
    expect(config.layers.globalCloudsIr).toBe(false);
    expect(config.layers.earthquakes).toBe(false);
    expect(config.layers.solarShading).toBe(true);
    expect(config.data.demoTime.startIsoUtc).toBe(VISUAL_SCENARIO_UTC["iss-presentation"]);
    const row = config.scene?.layers.find((l) => l.id === "orbitalTracks");
    expect(row?.enabled).toBe(true);
  });

  it("enables planetary objects with all bodies on and no live feeds", () => {
    const config = VISUAL_SCENARIOS["planetary-objects"].buildConfig();
    expect(config.layers.planetaryObjects).toBe(true);
    expect(config.layers.orbitalTracks).toBe(false);
    expect(config.layers.globalCloudsIr).toBe(false);
    expect(config.layers.earthquakes).toBe(false);
    expect(config.data.demoTime.startIsoUtc).toBe(VISUAL_SCENARIO_UTC["planetary-objects"]);
    const row = config.scene?.layers.find((l) => l.id === "planetaryObjects");
    expect(row?.enabled).toBe(true);
    expect(row?.source.kind === "derived" ? row.source.parameters?.bodies : undefined).toMatchObject({
      mercury: { enabled: true },
      pluto: { enabled: true },
    });
  });

  it("enables Milky Way with factory presentation and no live feeds", () => {
    const config = VISUAL_SCENARIOS["milky-way"].buildConfig();
    expect(config.layers.milkyWay).toBe(true);
    expect(config.layers.planetaryObjects).toBe(false);
    expect(config.layers.orbitalTracks).toBe(false);
    expect(config.layers.globalCloudsIr).toBe(false);
    expect(config.layers.earthquakes).toBe(false);
    expect(config.data.demoTime.startIsoUtc).toBe(VISUAL_SCENARIO_UTC["milky-way"]);
    const row = config.scene?.layers.find((l) => l.id === "milkyWay");
    expect(row?.enabled).toBe(true);
    expect(row?.source.kind === "derived" ? row.source.product : undefined).toBe("milkyWay");
    expect(row?.source.kind === "derived" ? row.source.parameters?.bandWidth : undefined).toBe(
      "normal",
    );
    expect(
      row?.source.kind === "derived" ? row.source.parameters?.galacticAnticenterEnabled : undefined,
    ).toBe(false);
    expect(
      row?.source.kind === "derived" ? row.source.parameters?.visibilityContoursEnabled : undefined,
    ).toBe(true);
    expect(
      row?.source.kind === "derived" ? row.source.parameters?.showVisibilityContourLabels : undefined,
    ).toBe(true);
    expect(
      row?.source.kind === "derived" ? row.source.parameters?.viewingEventsEnabled : undefined,
    ).toBe(true);
    expect(
      row?.source.kind === "derived" ? row.source.parameters?.showViewingEventLabels : undefined,
    ).toBe(true);
  });

  it("iss-presentation apply installs a DEV prepared ISS view without network", () => {
    const session = applyVisualScenarioFromLocation("?scenario=iss-presentation");
    expect(session.kind).toBe("applied");
    const stub = {
      productInstantMs: Date.parse(VISUAL_SCENARIO_UTC["iss-presentation"]),
      resolveSnapshot: async () => ({ ok: false as const }),
      getLifecycleState: () => ({ sourceId: "iss-orbital-track-v1", state: "idle" as const }),
      getPreparedEquirectRaster: () => null,
      getPreparedCloudOpacity: () => null,
      getPreparedPointFeatures: () => null,
      getPreparedTracks: () => null,
    };
    const wrapped = attachVisualScenarioPreparedTracks(stub as never);
    const view = wrapped.getPreparedTracks("iss-orbital-track-v1");
    expect(view).not.toBeNull();
    expect(view?.versionId).toBe("iss-presentation-dev");
    expect(view?.tracks[0]?.samples.length).toBeGreaterThan(20);
  });

  it("earthquake-presentation apply installs a DEV prepared earthquake view without network", () => {
    const session = applyVisualScenarioFromLocation("?scenario=earthquake-presentation");
    expect(session.kind).toBe("applied");
    if (session.kind !== "applied") return;
    expect(session.id).toBe("earthquake-presentation");
    expect(session.config.layers.earthquakes).toBe(true);
    expect(session.config.data.demoTime.startIsoUtc).toBe(
      VISUAL_SCENARIO_UTC["earthquake-presentation"],
    );
    const stub = {
      productInstantMs: Date.parse(VISUAL_SCENARIO_UTC["earthquake-presentation"]),
      resolveSnapshot: async () => ({ ok: false as const }),
      getLifecycleState: () => ({ sourceId: "usgs-earthquakes-v1", state: "idle" as const }),
      getPreparedEquirectRaster: () => null,
      getPreparedCloudOpacity: () => null,
      getPreparedPointFeatures: () => null,
      getPreparedTracks: () => null,
    };
    const wrapped = attachVisualScenarioPreparedPointFeatures(stub as never);
    const view = wrapped.getPreparedPointFeatures("usgs-earthquakes-v1");
    expect(view).not.toBeNull();
    expect(view?.versionId).toBe("earthquake-presentation-dev");
    expect(view?.origin).toBe("fixture");
    expect(view?.devAllowFixturePaint).toBe(true);
    expect(view?.features.length).toBeGreaterThan(8);
  });

  it("clouds apply installs a DEV prepared Clouds view labeled fixture without network", () => {
    const session = applyVisualScenarioFromLocation("?scenario=clouds");
    expect(session.kind).toBe("applied");
    if (session.kind !== "applied") return;
    expect(session.id).toBe("clouds");
    expect(session.config.layers.globalCloudsIr).toBe(true);
    expect(session.config.data.demoTime.startIsoUtc).toBe(VISUAL_SCENARIO_UTC.clouds);
    const stub = {
      productInstantMs: Date.parse(VISUAL_SCENARIO_UTC.clouds),
      resolveSnapshot: async () => ({ ok: false as const }),
      getLifecycleState: () => ({ sourceId: "global-clouds-ir-v1", state: "idle" as const }),
      getPreparedEquirectRaster: () => null,
      getPreparedCloudOpacity: () => null,
      getPreparedPointFeatures: () => null,
      getPreparedTracks: () => null,
    };
    const wrapped = attachVisualScenarioPreparedEquirect(stub as never);
    const view = wrapped.getPreparedEquirectRaster("global-clouds-ir-v1");
    expect(view).not.toBeNull();
    expect(view?.versionId).toBe("clouds-presentation-dev");
    expect(view?.origin).toBe("fixture");
    expect(view?.devAllowFixturePaint).toBe(true);
    expect(view?.coverageKind).toBe("global");
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

  it("applies moon-libration DEV observerCity, orientation, and style parameters", () => {
    const sydney = resolveVisualScenarioSession({
      isDev: true,
      search: "?scenario=moon-libration&observerCity=sydney&librationStyle=crosshair",
    });
    expect(sydney.kind).toBe("applied");
    if (sydney.kind === "applied") {
      expect(sydney.config.chrome.displayTime.topBandAnchor).toEqual({
        mode: "fixedCity",
        cityId: "city.sydney",
      });
      const row = sydney.config.scene?.layers.find((l) => l.id === "sublunarMarker");
      expect(row?.source.kind === "derived" ? row.source.parameters?.librationStyle : undefined).toBe(
        "crosshair",
      );
    }
    const none = resolveVisualScenarioSession({
      isDev: true,
      search: "?scenario=moon-libration&observerCity=none",
    });
    expect(none.kind).toBe("applied");
    if (none.kind === "applied") {
      expect(none.config.chrome.displayTime.topBandAnchor).toEqual({ mode: "auto" });
    }
    const map = resolveVisualScenarioSession({
      isDev: true,
      search: "?scenario=moon-libration&librationOrientation=map",
    });
    expect(map.kind).toBe("applied");
    if (map.kind === "applied") {
      const row = map.config.scene?.layers.find((l) => l.id === "sublunarMarker");
      expect(row?.source.kind === "derived" ? row.source.parameters?.librationOrientation : undefined).toBe(
        "map",
      );
    }
  });

  it("parses moon-libration observerCity catalog ids", () => {
    expect(parseMoonLibrationObserverCityId("sydney")).toBe("city.sydney");
    expect(parseMoonLibrationObserverCityId("sao-paulo")).toBe("city.sao_paulo");
    expect(parseMoonLibrationObserverCityId("none")).toBe("none");
    expect(parseMoonLibrationObserverCityId("not-a-city")).toBeNull();
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

  it("seeds solar eclipse scenarios with the production overlay at NASA fixture UTCs", () => {
    for (const id of [
      "solar-eclipse-total",
      "solar-eclipse-annular",
      "solar-eclipse-partial",
      "solar-eclipse-dateline",
    ] as const) {
      const config = VISUAL_SCENARIOS[id].buildConfig();
      expect(config.layers.solarEclipse).toBe(true);
      expect(config.layers.solarShading).toBe(true);
      expect(config.layers.subsolarMarker).toBe(true);
      expect(config.layers.sublunarMarker).toBe(true);
      expect(config.layers.lunarGroundTrack).toBe(false);
      expect(config.layers.lunarLocus).toBe(false);
      expect(config.layers.solarAnalemma).toBe(false);
      expect(config.data.demoTime.startIsoUtc).toBe(VISUAL_SCENARIO_UTC[id]);
      const row = config.scene?.layers.find((l) => l.id === "solarEclipse");
      expect(row?.enabled).toBe(true);
      expect(row?.source.kind === "derived" ? row.source.parameters?.forecastHorizonDays : undefined).toBe(
        0,
      );
      expect(config.scene?.eclipseAlignment.enabled).toBe(true);
      expect(config.scene?.eclipseAlignment.solarEnabled).toBe(true);
    }
  });

  it("seeds forecast scenarios with a production overlay several days before NASA events", () => {
    const total = VISUAL_SCENARIOS["solar-eclipse-forecast"].buildConfig();
    expect(total.layers.solarEclipse).toBe(true);
    expect(total.data.demoTime.startIsoUtc).toBe("2024-04-03T18:00:00.000Z");
    const totalRow = total.scene?.layers.find((l) => l.id === "solarEclipse");
    expect(totalRow?.source.kind === "derived" ? totalRow.source.parameters?.forecastHorizonDays : undefined).toBe(
      7,
    );

    const annular = VISUAL_SCENARIOS["solar-eclipse-forecast-annular"].buildConfig();
    expect(annular.data.demoTime.startIsoUtc).toBe("2023-10-09T18:00:00.000Z");

    const partial = VISUAL_SCENARIOS["solar-eclipse-forecast-partial"].buildConfig();
    expect(partial.data.demoTime.startIsoUtc).toBe("2022-10-20T11:00:00.000Z");

    const multiple = VISUAL_SCENARIOS["solar-eclipse-forecast-multiple"].buildConfig();
    expect(multiple.data.demoTime.startIsoUtc).toBe("2023-10-01T00:00:00.000Z");
    const multiRow = multiple.scene?.layers.find((l) => l.id === "solarEclipse");
    expect(multiRow?.source.kind === "derived" ? multiRow.source.parameters?.forecastHorizonDays : undefined).toBe(
      365,
    );
  });

  it("seeds lunar-eclipse-forecast-total several days before the 2022 total", () => {
    const config = VISUAL_SCENARIOS["lunar-eclipse-forecast-total"].buildConfig();
    expect(config.layers.lunarEclipse).toBe(true);
    expect(config.data.demoTime.startIsoUtc).toBe("2022-05-13T04:00:00.000Z");
    const row = config.scene?.layers.find((l) => l.id === "lunarEclipse");
    expect(row?.source.kind === "derived" ? row.source.parameters?.forecastHorizonDays : undefined).toBe(
      7,
    );
    const liveOnly = resolveVisualScenarioSession({
      isDev: true,
      search: "?scenario=lunar-eclipse-forecast-total&horizon=0",
    });
    expect(liveOnly.kind).toBe("applied");
    if (liveOnly.kind === "applied") {
      const liveRow = liveOnly.config.scene?.layers.find((l) => l.id === "lunarEclipse");
      expect(
        liveRow?.source.kind === "derived" ? liveRow.source.parameters?.forecastHorizonDays : undefined,
      ).toBe(0);
    }
  });

  it("accepts DEV eclipsePhase stations on the 2022 total lunar eclipse scenario", () => {
    const partial = resolveVisualScenarioSession({
      isDev: true,
      search: "?scenario=lunar-eclipse-total&eclipsePhase=partial",
    });
    expect(partial.kind).toBe("applied");
    if (partial.kind === "applied") {
      expect(partial.startIsoUtc).toBe("2022-05-16T02:50:00.000Z");
      expect(partial.config.data.demoTime.startIsoUtc).toBe("2022-05-16T02:50:00.000Z");
      expect(partial.config.layers.lunarEclipse).toBe(true);
    }
    const pre = resolveVisualScenarioSession({
      isDev: true,
      search: "?scenario=lunar-eclipse-total&eclipsePhase=pre",
    });
    expect(pre.kind).toBe("applied");
    if (pre.kind === "applied") {
      expect(pre.startIsoUtc).toBe("2022-05-16T01:20:00.000Z");
    }
  });

  it("seeds solar-eclipse-2017 with a 7-day horizon and showcase presentation", () => {
    const config = VISUAL_SCENARIOS["solar-eclipse-2017"].buildConfig();
    expect(config.layers.solarEclipse).toBe(true);
    expect(config.data.demoTime.startIsoUtc).toBe("2017-08-21T18:25:29.700Z");
    const row = config.scene?.layers.find((l) => l.id === "solarEclipse");
    expect(row?.source.kind === "derived" ? row.source.parameters?.forecastHorizonDays : undefined).toBe(
      7,
    );
    expect(row?.source.kind === "derived" ? row.source.parameters?.liveGroundPositionSize : undefined).toBe(
      "large",
    );
    expect(config.scene?.eclipseAlignment.intensity).toBe("dramatic");
    expect(config.scene?.eclipseInfo.labelsEnabled).toBe(false);
    const moon = config.scene?.layers.find((l) => l.id === "sublunarMarker");
    expect(moon?.source.kind === "derived" ? moon.source.parameters?.size : undefined).toBe("extraLarge");
    const pre = resolveVisualScenarioSession({
      isDev: true,
      search: "?scenario=solar-eclipse-2017&eclipseStation=preCentral",
    });
    expect(pre.kind).toBe("applied");
    if (pre.kind === "applied") {
      expect(pre.startIsoUtc).toBe("2017-08-21T15:56:00.000Z");
      expect(pre.config.data.demoTime.startIsoUtc).toBe("2017-08-21T15:56:00.000Z");
    }
    const stationA = resolveVisualScenarioSession({
      isDev: true,
      search: "?scenario=solar-eclipse-2017&eclipseStation=stationA",
    });
    expect(stationA.kind).toBe("applied");
    if (stationA.kind === "applied") {
      expect(stationA.startIsoUtc).toBe("2017-08-21T14:42:59.000Z");
    }
    const stationE = resolveVisualScenarioSession({
      isDev: true,
      search: "?scenario=solar-eclipse-2017&eclipseStation=stationE",
    });
    expect(stationE.kind).toBe("applied");
    if (stationE.kind === "applied") {
      expect(stationE.startIsoUtc).toBe("2017-08-21T18:36:03.000Z");
    }
    const rasterWest = resolveVisualScenarioSession({
      isDev: true,
      search: "?scenario=solar-eclipse-2017&eclipseStation=rasterWest",
    });
    expect(rasterWest.kind).toBe("applied");
    if (rasterWest.kind === "applied") {
      expect(rasterWest.startIsoUtc).toBe("2017-08-21T16:45:01.000Z");
    }
    const rasterLate = resolveVisualScenarioSession({
      isDev: true,
      search: "?scenario=solar-eclipse-2017&eclipseStation=rasterLate",
    });
    expect(rasterLate.kind).toBe("applied");
    if (rasterLate.kind === "applied") {
      expect(rasterLate.startIsoUtc).toBe("2017-08-21T19:56:08.000Z");
    }
    const horizonA = resolveVisualScenarioSession({
      isDev: true,
      search: "?scenario=solar-eclipse-2017&eclipseStation=horizonA",
    });
    expect(horizonA.kind).toBe("applied");
    if (horizonA.kind === "applied") {
      expect(horizonA.startIsoUtc).toBe("2017-08-21T14:30:00.000Z");
    }
    const horizonE = resolveVisualScenarioSession({
      isDev: true,
      search: "?scenario=solar-eclipse-2017&eclipseStation=horizonE",
    });
    expect(horizonE.kind).toBe("applied");
    if (horizonE.kind === "applied") {
      expect(horizonE.startIsoUtc).toBe("2017-08-21T19:55:32.000Z");
    }
  });

  it("seeds lunar eclipse scenarios with the production overlay at NASA fixture UTCs", () => {
    for (const id of ["lunar-eclipse-total", "lunar-eclipse-partial", "lunar-eclipse-horizon"] as const) {
      const config = VISUAL_SCENARIOS[id].buildConfig();
      expect(config.layers.lunarEclipse).toBe(true);
      expect(config.layers.sublunarMarker).toBe(true);
      expect(config.layers.subsolarMarker).toBe(true);
      expect(config.layers.solarShading).toBe(true);
      expect(config.layers.cityPins).toBe(true);
      expect(config.data.demoTime.startIsoUtc).toBe(VISUAL_SCENARIO_UTC[id]);
      const row = config.scene?.layers.find((l) => l.id === "lunarEclipse");
      expect(row?.enabled).toBe(true);
      expect(row?.source.kind === "derived" ? row.source.product : undefined).toBe(
        "lunarEclipseVisibility",
      );
      expect(config.scene?.eclipseAlignment.enabled).toBe(true);
      expect(config.scene?.eclipseAlignment.lunarEnabled).toBe(true);
    }
  });

  it("seeds lunar-eclipse-2029 stations for the June 2029 total", () => {
    const config = VISUAL_SCENARIOS["lunar-eclipse-2029"].buildConfig();
    expect(config.layers.lunarEclipse).toBe(true);
    expect(config.data.demoTime.startIsoUtc).toBe("2029-06-26T03:22:05.000Z");
    expect(config.scene?.eclipseInfo.labelsEnabled).toBe(true);
    const upcoming = resolveVisualScenarioSession({
      isDev: true,
      search: "?scenario=lunar-eclipse-2029&eclipseStation=upcoming",
    });
    expect(upcoming.kind).toBe("applied");
    if (upcoming.kind === "applied") {
      expect(upcoming.startIsoUtc).toBe("2029-06-25T18:00:00.000Z");
    }
    const pre = resolveVisualScenarioSession({
      isDev: true,
      search: "?scenario=lunar-eclipse-2029&eclipseStation=preActive",
    });
    expect(pre.kind).toBe("applied");
    if (pre.kind === "applied") {
      expect(pre.startIsoUtc).toBe("2029-06-26T00:29:32.000Z");
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

  it("honors DEV nightVeilCurve without persisting it as configuration", () => {
    applyVisualScenarioFromLocation(
      "?scenario=twilight-presentation&nightVeilCurve=linearSmooth",
    );
    expect(getActiveNightVeilTransferId()).toBe("linearSmooth");
    applyVisualScenarioFromLocation("?scenario=terminator");
    expect(getActiveNightVeilTransferId()).toBe("twilightAnchored");
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
    expect(mainSource).not.toMatch(/solar-eclipse-total/);
    expect(mainSource).not.toMatch(/lunar-eclipse-total/);
  });
});

describe("eclipse scenario DEV observerCity", () => {
  it("applies catalog observerCity on solar-eclipse-total without changing the overlay", () => {
    const tokyo = resolveVisualScenarioSession({
      isDev: true,
      search: "?scenario=solar-eclipse-total&observerCity=tokyo",
    });
    expect(tokyo.kind).toBe("applied");
    if (tokyo.kind === "applied") {
      expect(tokyo.config.chrome.displayTime.topBandAnchor).toEqual({
        mode: "fixedCity",
        cityId: "city.tokyo",
      });
      expect(tokyo.config.layers.solarEclipse).toBe(true);
    }
    const none = resolveVisualScenarioSession({
      isDev: true,
      search: "?scenario=lunar-eclipse-total&observerCity=none",
    });
    expect(none.kind).toBe("applied");
    if (none.kind === "applied") {
      expect(none.config.chrome.displayTime.topBandAnchor).toEqual({ mode: "auto" });
      expect(none.config.layers.lunarEclipse).toBe(true);
    }
  });
});

describe("milky-way scenario DEV observerCity", () => {
  it("applies São Paulo as the reference city without disabling viewing events", () => {
    const session = resolveVisualScenarioSession({
      isDev: true,
      search: "?scenario=milky-way&observerCity=sao_paulo",
    });
    expect(session.kind).toBe("applied");
    if (session.kind === "applied") {
      expect(session.config.chrome.displayTime.topBandAnchor).toEqual({
        mode: "fixedCity",
        cityId: "city.sao_paulo",
      });
      expect(session.config.layers.milkyWay).toBe(true);
      const row = session.config.scene?.layers.find((l) => l.id === "milkyWay");
      expect(row?.source.kind === "derived" ? row.source.parameters?.viewingEventsEnabled : undefined).toBe(
        true,
      );
      expect(row?.source.kind === "derived" ? row.source.parameters?.showViewingEventLabels : undefined).toBe(
        true,
      );
    }
  });

  it("mwEvent=active seeds the Knoxville viewing-window station without a new scenario id", () => {
    const session = resolveVisualScenarioSession({
      isDev: true,
      search: "?scenario=milky-way&mwEvent=active",
    });
    expect(session.kind).toBe("applied");
    if (session.kind === "applied") {
      expect(session.startIsoUtc).toBe("2026-08-20T02:27:16.000Z");
      expect(session.config.data.demoTime.startIsoUtc).toBe("2026-08-20T02:27:16.000Z");
    }
  });
});
