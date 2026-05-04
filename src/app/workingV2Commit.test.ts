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
import { createTimeContext } from "../core/time";
import { isSolarShadingPayload } from "../layers/solarShadingPayload";
import {
  buildDefaultSceneConfigFromLayerFlags,
  deriveLayerEnableFlagsFromScene,
} from "../config/v2/sceneConfig";
import {
  commitWorkingV2Update,
  deriveAppConfigFromV2,
  replaceWorkingV2FromSnapshot,
  sceneRuntimeAffectingEqual,
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

  it("sceneRuntimeAffectingEqual is false when only emissive night-lights mode changes", () => {
    const a = buildDefaultSceneConfigFromLayerFlags({
      baseMap: true,
      solarShading: true,
      grid: false,
      staticEquirectOverlay: false,
      cityPins: false,
      subsolarMarker: false,
      sublunarMarker: false,
      solarAnalemma: false,
    });
    const b: typeof a = {
      ...a,
      illumination: {
        ...a.illumination,
        emissiveNightLights: { ...a.illumination.emissiveNightLights, mode: "illustrative" },
      },
    };
    expect(sceneRuntimeAffectingEqual(a, b)).toBe(false);
    expect(sceneRuntimeAffectingEqual(a, a)).toBe(true);
  });

  it("LayersTab-style emissive-only commit persists mode, replaces registry, and updates solar shading payload", () => {
    const seed = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    const base = normalizeLibrationConfig({
      ...seed,
      scene: {
        ...seed.scene!,
        illumination: {
          ...seed.scene!.illumination,
          emissiveNightLights: { ...seed.scene!.illumination.emissiveNightLights, mode: "off" },
        },
      },
    });
    expect(base.scene!.illumination.emissiveNightLights.mode).toBe("off");
    const { workingV2Ref, derivedAppConfigRef, registryRef } = setupRefs(base);
    const prevDerivedScene = deriveAppConfigFromV2(workingV2Ref.current!).scene;
    const registryBefore = registryRef.current;

    commitWorkingV2Update(workingV2Ref, derivedAppConfigRef, registryRef, (draft) => {
      const baseScene = draft.scene ?? buildDefaultSceneConfigFromLayerFlags(draft.layers);
      draft.scene = {
        ...baseScene,
        illumination: {
          ...baseScene.illumination,
          emissiveNightLights: {
            ...baseScene.illumination.emissiveNightLights,
            mode: "illustrative",
          },
        },
      };
      draft.layers = deriveLayerEnableFlagsFromScene(draft.scene!);
    });

    expect(workingV2Ref.current!.scene!.illumination.emissiveNightLights.mode).toBe("illustrative");
    expect(derivedAppConfigRef.current.scene.illumination.emissiveNightLights.mode).toBe("illustrative");
    expect(sceneRuntimeAffectingEqual(prevDerivedScene, derivedAppConfigRef.current.scene)).toBe(false);
    expect(registryRef.current).not.toBe(registryBefore);

    const solar = registryRef.current.getLayers().find((l) => l.id === SOLAR_SHADING_LAYER_ID);
    expect(solar).toBeDefined();
    const st = solar!.getState(createTimeContext(Date.now(), 0, false));
    expect(isSolarShadingPayload(st.data)).toBe(true);
    if (isSolarShadingPayload(st.data)) {
      expect(st.data.emissiveNightLightsMode).toBe("illustrative");
      expect(st.data.emissiveCompositionAssetId.trim()).not.toBe("");
    }
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

  it("scene-only layer reordering rebuilds the layer registry", () => {
    const base = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    const { workingV2Ref, derivedAppConfigRef, registryRef } = setupRefs(base);
    const registryBefore = registryRef.current;
    const [first, second] = workingV2Ref.current!.scene!.layers;
    expect(first).toBeDefined();
    expect(second).toBeDefined();

    commitWorkingV2Update(workingV2Ref, derivedAppConfigRef, registryRef, (draft) => {
      const layers = [...draft.scene!.layers];
      layers[0] = { ...layers[0]!, order: 10 };
      layers[1] = { ...layers[1]!, order: 0 };
      draft.scene = { ...draft.scene!, layers };
    });

    expect(registryRef.current).not.toBe(registryBefore);
    expect(derivedAppConfigRef.current.scene.layers[0]!.order).toBe(10);
    expect(derivedAppConfigRef.current.scene.layers[1]!.order).toBe(0);
  });

  it("scene-only layer opacity updates rebuild the layer registry", () => {
    const base = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    const { workingV2Ref, derivedAppConfigRef, registryRef } = setupRefs(base);
    const registryBefore = registryRef.current;

    commitWorkingV2Update(workingV2Ref, derivedAppConfigRef, registryRef, (draft) => {
      const layers = draft.scene!.layers.map((layer) =>
        layer.id === "grid" ? { ...layer, opacity: 0.25 } : layer,
      );
      draft.scene = { ...draft.scene!, layers };
    });

    expect(registryRef.current).not.toBe(registryBefore);
    expect(derivedAppConfigRef.current.scene.layers.find((layer) => layer.id === "grid")?.opacity).toBe(0.25);
  });

  it("scene-only base map id changes rebuild the layer registry", () => {
    const base = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    const { workingV2Ref, derivedAppConfigRef, registryRef } = setupRefs(base);
    const registryBefore = registryRef.current;

    commitWorkingV2Update(workingV2Ref, derivedAppConfigRef, registryRef, (draft) => {
      draft.scene = {
        ...draft.scene!,
        baseMap: {
          ...draft.scene!.baseMap,
          id: "equirect-world-topo-v1",
        },
      };
    });

    expect(registryRef.current).not.toBe(registryBefore);
    expect(derivedAppConfigRef.current.scene.baseMap.id).toBe("equirect-world-topo-v1");
  });

  it("scene-only derived-source parameters changes rebuild the layer registry", () => {
    const base = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    const { workingV2Ref, derivedAppConfigRef, registryRef } = setupRefs(base);
    const registryBefore = registryRef.current;

    commitWorkingV2Update(workingV2Ref, derivedAppConfigRef, registryRef, (draft) => {
      const layers = draft.scene!.layers.map((layer) =>
        layer.id === "solarAnalemma" && layer.source.kind === "derived"
          ? {
              ...layer,
              source: {
                ...layer.source,
                parameters: { ...(layer.source.parameters ?? {}), utcHour: 14 },
              },
            }
          : layer,
      );
      draft.scene = { ...draft.scene!, layers };
    });

    expect(registryRef.current).not.toBe(registryBefore);
    const analemma = derivedAppConfigRef.current.scene.layers.find((layer) => layer.id === "solarAnalemma");
    expect(analemma?.source.kind).toBe("derived");
    expect((analemma?.source.kind === "derived" ? analemma.source.parameters?.utcHour : undefined)).toBe(14);
  });

  it("scene-only static source changes rebuild the layer registry", () => {
    const base = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    const { workingV2Ref, derivedAppConfigRef, registryRef } = setupRefs(base);
    const registryBefore = registryRef.current;

    commitWorkingV2Update(workingV2Ref, derivedAppConfigRef, registryRef, (draft) => {
      const layers = draft.scene!.layers.map((layer) =>
        layer.id === "staticEquirectOverlay" && layer.source.kind === "staticRaster"
          ? { ...layer, source: { ...layer.source, src: "/maps/world-equirectangular-night.jpg" } }
          : layer,
      );
      draft.scene = { ...draft.scene!, layers };
    });

    expect(registryRef.current).not.toBe(registryBefore);
    const staticOverlay = derivedAppConfigRef.current.scene.layers.find(
      (layer) => layer.id === "staticEquirectOverlay",
    );
    expect(staticOverlay?.source.kind).toBe("staticRaster");
    expect(
      staticOverlay?.source.kind === "staticRaster" ? staticOverlay.source.src : undefined,
    ).toBe("/maps/world-equirectangular-night.jpg");
  });
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
