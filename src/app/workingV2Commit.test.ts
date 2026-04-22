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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLayerRegistryFromConfig } from "./bootstrap";
import { getActiveAppConfig } from "../config/displayPresets";
import {
  appConfigToV2,
  normalizeLibrationConfig,
  v2ToAppConfig,
} from "../config/v2/librationConfig";
import type { LibrationConfigV2 } from "../config/v2/librationConfig";
import {
  DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
  resolveCitiesForPins,
  resolveEnabledCustomPinsForMap,
} from "../config/appConfig";
import {
  reviveLibrationConfigV2FromUnknown,
  WORKING_V2_LOCAL_STORAGE_KEY,
} from "../config/v2/workingV2Persistence";
import {
  commitWorkingV2Update,
  deriveAppConfigFromV2,
  replaceWorkingV2FromSnapshot,
} from "./workingV2Commit";

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

const GRID_LAYER_ID = "layer.grid.latLon";
const SOLAR_SHADING_LAYER_ID = "layer.solarShading.dayNight";
const CITY_PINS_LAYER_ID = "layer.points.referenceCities";
const BASE_MAP_LAYER_ID = "layer.baseMap.world";
const SUBSOLAR_MARKER_LAYER_ID = "layer.points.subsolar";
const SUBLUNAR_MARKER_LAYER_ID = "layer.points.sublunar";
const STATIC_EQUIRECT_OVERLAY_LAYER_ID = "layer.staticRaster.staticEquirectOverlay";

function setupRefs(initial: LibrationConfigV2) {
  const workingV2Ref: { current: LibrationConfigV2 | null } = {
    current: normalizeLibrationConfig(initial),
  };
  const derivedAppConfigRef: {
    current: ReturnType<typeof deriveAppConfigFromV2>;
  } = {
    current: deriveAppConfigFromV2(workingV2Ref.current!),
  };
  const registryRef = {
    current: createLayerRegistryFromConfig(derivedAppConfigRef.current),
  };
  return { workingV2Ref, derivedAppConfigRef, registryRef };
}

function registryIds(registry: { current: { getLayers: () => { id: string }[] } }) {
  return registry.current.getLayers().map((l) => l.id);
}

describe("commitWorkingV2Update", () => {
  it("toggling grid updates working v2 and derived AppConfig", () => {
    const base = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    const beforeGrid = base.layers.grid;
    const { workingV2Ref, derivedAppConfigRef, registryRef } = setupRefs(base);

    commitWorkingV2Update(workingV2Ref, derivedAppConfigRef, registryRef, (draft) => {
      draft.layers = { ...draft.layers, grid: !draft.layers.grid };
    });

    expect(workingV2Ref.current!.layers.grid).toBe(!beforeGrid);
    expect(derivedAppConfigRef.current.layers.grid).toBe(!beforeGrid);
    expect(v2ToAppConfig(workingV2Ref.current!).layers.grid).toBe(!beforeGrid);
    const ids = registryIds(registryRef);
    if (workingV2Ref.current!.layers.grid) {
      expect(ids).toContain(GRID_LAYER_ID);
    } else {
      expect(ids).not.toContain(GRID_LAYER_ID);
    }
  });

  it("toggling cityPins updates the layer registry membership", () => {
    const base = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    const wantPins = !base.layers.cityPins;
    const { workingV2Ref, derivedAppConfigRef, registryRef } = setupRefs(base);

    commitWorkingV2Update(workingV2Ref, derivedAppConfigRef, registryRef, (draft) => {
      draft.layers = { ...draft.layers, cityPins: wantPins };
    });

    const ids = registryIds(registryRef);
    if (wantPins) {
      expect(ids).toContain(CITY_PINS_LAYER_ID);
    } else {
      expect(ids).not.toContain(CITY_PINS_LAYER_ID);
    }
  });

  it("adding a custom pin rebuilds the registry when cityPins stays on", () => {
    const base = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    const { workingV2Ref, derivedAppConfigRef, registryRef } = setupRefs(base);
    const registryBefore = registryRef.current;

    commitWorkingV2Update(workingV2Ref, derivedAppConfigRef, registryRef, (draft) => {
      draft.pins.custom = [
        ...draft.pins.custom,
        {
          id: "custom.testpin",
          label: "T",
          latitude: 15,
          longitude: 30,
          enabled: true,
        },
      ];
    });

    expect(registryRef.current).not.toBe(registryBefore);
    expect(derivedAppConfigRef.current.customPins).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "custom.testpin", label: "T", enabled: true }),
      ]),
    );
    expect(resolveEnabledCustomPinsForMap(derivedAppConfigRef.current)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "custom.testpin", latitude: 15, longitude: 30 }),
      ]),
    );
  });

  it("changing reference visibleCityIds rebuilds the registry when cityPins stays on", () => {
    const base = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    const { workingV2Ref, derivedAppConfigRef, registryRef } = setupRefs(base);
    const registryBefore = registryRef.current;

    commitWorkingV2Update(workingV2Ref, derivedAppConfigRef, registryRef, (draft) => {
      draft.pins.reference.visibleCityIds = draft.pins.reference.visibleCityIds.filter(
        (id) => id !== "city.london",
      );
    });

    expect(registryRef.current).not.toBe(registryBefore);
    expect(derivedAppConfigRef.current.visibleCityIds).not.toContain("city.london");
    expect(resolveCitiesForPins(derivedAppConfigRef.current).every((c) => c.id !== "city.london")).toBe(
      true,
    );
  });

  it("changing pins.presentation replaces the registry when cityPins is on", () => {
    const base = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    expect(base.layers.cityPins).toBe(true);
    const { workingV2Ref, derivedAppConfigRef, registryRef } = setupRefs(base);
    const registryBefore = registryRef.current;

    commitWorkingV2Update(workingV2Ref, derivedAppConfigRef, registryRef, (draft) => {
      draft.pins.presentation.scale = "large";
    });

    expect(registryRef.current).not.toBe(registryBefore);
    expect(derivedAppConfigRef.current.pinPresentation.scale).toBe("large");
  });

  it("changing pins.presentation does not replace the layer registry when cityPins is off", () => {
    const v2 = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    const base = normalizeLibrationConfig({
      ...v2,
      layers: { ...v2.layers, cityPins: false },
    });
    const { workingV2Ref, derivedAppConfigRef, registryRef } = setupRefs(base);
    const registryBefore = registryRef.current;

    commitWorkingV2Update(workingV2Ref, derivedAppConfigRef, registryRef, (draft) => {
      draft.pins.presentation.showLabels = false;
    });

    expect(registryRef.current).toBe(registryBefore);
    expect(derivedAppConfigRef.current.pinPresentation.showLabels).toBe(false);
  });

  it("changing chrome.layout only does not replace the layer registry", () => {
    const base = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    const { workingV2Ref, derivedAppConfigRef, registryRef } = setupRefs(base);
    const registryBefore = registryRef.current;

    commitWorkingV2Update(workingV2Ref, derivedAppConfigRef, registryRef, (draft) => {
      draft.chrome.layout.bottomInformationBarVisible = false;
      draft.chrome.layout.timezoneLetterRowVisible = false;
    });

    expect(registryRef.current).toBe(registryBefore);
    expect(derivedAppConfigRef.current.displayChromeLayout).toEqual({
      ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
      bottomInformationBarVisible: false,
      timezoneLetterRowVisible: false,
    });
  });

  it("changing displayTime (without topBandMode) does not replace the layer registry", () => {
    const base = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    const { workingV2Ref, derivedAppConfigRef, registryRef } = setupRefs(base);
    const registryBefore = registryRef.current;

    commitWorkingV2Update(workingV2Ref, derivedAppConfigRef, registryRef, (draft) => {
      draft.chrome.displayTime.referenceTimeZone = {
        source: "fixed",
        timeZone: "Asia/Tokyo",
      };
    });

    expect(registryRef.current).toBe(registryBefore);
    expect(derivedAppConfigRef.current.displayTime.referenceTimeZone).toEqual({
      source: "fixed",
      timeZone: "Asia/Tokyo",
    });
  });

  it("changing topBandMode replaces the layer registry when city pins are enabled (pin labels follow hour format)", () => {
    const base = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    const v2 = normalizeLibrationConfig({
      ...base,
      layers: { ...base.layers, cityPins: true },
    });
    const { workingV2Ref, derivedAppConfigRef, registryRef } = setupRefs(v2);
    const registryBefore = registryRef.current;

    commitWorkingV2Update(workingV2Ref, derivedAppConfigRef, registryRef, (draft) => {
      draft.chrome.displayTime.topBandMode = "utc24";
    });

    expect(registryRef.current).not.toBe(registryBefore);
    expect(derivedAppConfigRef.current.displayTime.topBandMode).toBe("utc24");
  });

  it("changing topBandAnchor only does not replace the layer registry", () => {
    const base = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    const { workingV2Ref, derivedAppConfigRef, registryRef } = setupRefs(base);
    const registryBefore = registryRef.current;

    commitWorkingV2Update(workingV2Ref, derivedAppConfigRef, registryRef, (draft) => {
      draft.chrome.displayTime.topBandAnchor = { mode: "auto" };
    });

    expect(registryRef.current).toBe(registryBefore);
    expect(derivedAppConfigRef.current.displayTime.topBandAnchor).toEqual({ mode: "auto" });
  });

  it("changing geography only does not replace the layer registry", () => {
    const base = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    const { workingV2Ref, derivedAppConfigRef, registryRef } = setupRefs(base);
    const registryBefore = registryRef.current;

    commitWorkingV2Update(workingV2Ref, derivedAppConfigRef, registryRef, (draft) => {
      draft.geography.referenceMode = "fixedCoordinate";
      draft.geography.fixedCoordinate = {
        latitude: -10,
        longitude: 20,
        label: "Test",
      };
    });

    expect(registryRef.current).toBe(registryBefore);
    expect(derivedAppConfigRef.current.geography.referenceMode).toBe("fixedCoordinate");
    expect(derivedAppConfigRef.current.geography.fixedCoordinate.label).toBe("Test");
  });

  it("toggling solarShading updates the layer registry membership", () => {
    const base = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    const wantShading = !base.layers.solarShading;
    const { workingV2Ref, derivedAppConfigRef, registryRef } = setupRefs(base);

    commitWorkingV2Update(workingV2Ref, derivedAppConfigRef, registryRef, (draft) => {
      draft.layers = { ...draft.layers, solarShading: wantShading };
    });

    const ids = registryIds(registryRef);
    if (wantShading) {
      expect(ids).toContain(SOLAR_SHADING_LAYER_ID);
    } else {
      expect(ids).not.toContain(SOLAR_SHADING_LAYER_ID);
    }
  });

  it.each(
    [
      ["baseMap", BASE_MAP_LAYER_ID],
      ["grid", GRID_LAYER_ID],
      ["staticEquirectOverlay", STATIC_EQUIRECT_OVERLAY_LAYER_ID],
      ["subsolarMarker", SUBSOLAR_MARKER_LAYER_ID],
      ["sublunarMarker", SUBLUNAR_MARKER_LAYER_ID],
    ] as const,
  )(
    "toggling %s updates derived AppConfig and rebuilds the layer registry",
    (layerKey, layerId) => {
      const base = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
      const want = !base.layers[layerKey];
      const { workingV2Ref, derivedAppConfigRef, registryRef } = setupRefs(base);
      const registryBefore = registryRef.current;

      commitWorkingV2Update(workingV2Ref, derivedAppConfigRef, registryRef, (draft) => {
        draft.layers = { ...draft.layers, [layerKey]: want };
      });

      expect(registryRef.current).not.toBe(registryBefore);
      expect(derivedAppConfigRef.current.layers[layerKey]).toBe(want);
      expect(workingV2Ref.current!.layers[layerKey]).toBe(want);

      const ids = registryIds(registryRef);
      if (want) {
        expect(ids).toContain(layerId);
      } else {
        expect(ids).not.toContain(layerId);
      }
    },
  );
});

describe("replaceWorkingV2FromSnapshot", () => {
  it("replaces working v2, derived AppConfig, and persists like commit", () => {
    const base = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    const alternate = normalizeLibrationConfig({
      ...base,
      layers: { ...base.layers, grid: !base.layers.grid },
    });
    const { workingV2Ref, derivedAppConfigRef, registryRef } = setupRefs(base);

    replaceWorkingV2FromSnapshot(
      workingV2Ref,
      derivedAppConfigRef,
      registryRef,
      alternate,
    );

    expect(workingV2Ref.current!.layers.grid).toBe(alternate.layers.grid);
    expect(derivedAppConfigRef.current.layers.grid).toBe(alternate.layers.grid);
  });
});

describe("commitWorkingV2Update persistence", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", makeMemoryStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("writes updated working v2 to localStorage after commit", () => {
    const base = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    const beforeGrid = base.layers.grid;
    const { workingV2Ref, derivedAppConfigRef, registryRef } = setupRefs(base);

    commitWorkingV2Update(workingV2Ref, derivedAppConfigRef, registryRef, (draft) => {
      draft.layers = { ...draft.layers, grid: !draft.layers.grid };
    });

    const raw = globalThis.localStorage.getItem(WORKING_V2_LOCAL_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = reviveLibrationConfigV2FromUnknown(JSON.parse(raw!));
    expect(parsed).not.toBeNull();
    expect(parsed!.layers.grid).toBe(!beforeGrid);
  });
});
