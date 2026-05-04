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

/** @vitest-environment happy-dom */
import { useCallback, useRef, useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { createLayerRegistryFromConfig } from "../../app/bootstrap";
import { commitWorkingV2Update, deriveAppConfigFromV2 } from "../../app/workingV2Commit";
import { defaultLibrationConfigV2, normalizeLibrationConfig, type LibrationConfigV2 } from "../../config/v2/librationConfig";
import {
  DEFAULT_EMISSIVE_NIGHT_LIGHTS_ASSET_ID,
  DEFAULT_EMISSIVE_NIGHT_LIGHTS_PRESENTATION,
} from "../../config/v2/sceneConfig";
import { LayersTab } from "./LayersTab";

function LayersTabHarness({ initial }: { initial: LibrationConfigV2 }) {
  const [config, setConfig] = useState<LibrationConfigV2>(() => normalizeLibrationConfig(initial));
  const updateConfig = useCallback((updater: (draft: LibrationConfigV2) => void) => {
    setConfig((prev) => {
      const draft = normalizeLibrationConfig(prev);
      updater(draft);
      return normalizeLibrationConfig(draft);
    });
  }, []);
  return (
    <>
      <LayersTab config={config} updateConfig={updateConfig} />
      <pre data-testid="scene-state">{JSON.stringify(config.scene?.baseMap ?? {})}</pre>
      <pre data-testid="illumination-state">{JSON.stringify(config.scene?.illumination ?? null)}</pre>
    </>
  );
}

function readSceneBaseMapState(): {
  id?: string;
  presentationByMapId?: Record<string, { brightness: number; contrast: number; gamma: number; saturation: number }>;
} {
  return JSON.parse(screen.getByTestId("scene-state").textContent ?? "{}");
}

function readIlluminationState(): {
  moonlight?: { mode: string };
  emissiveNightLights?: {
    mode: string;
    assetId: string;
    presentation?: { intensity: number; driverExponent: number };
  };
} | null {
  return JSON.parse(screen.getByTestId("illumination-state").textContent ?? "null");
}

/** Same commit path as {@link App} `updateConfig` → {@link commitWorkingV2Update}. */
function LayersTabCommitHarness({ initial }: { initial: LibrationConfigV2 }) {
  const workingV2Ref = useRef(normalizeLibrationConfig(initial));
  const derivedAppConfigRef = useRef(deriveAppConfigFromV2(workingV2Ref.current));
  const registryRef = useRef(createLayerRegistryFromConfig(derivedAppConfigRef.current));
  const [, bump] = useState(0);
  const updateConfig = useCallback((updater: (draft: LibrationConfigV2) => void) => {
    commitWorkingV2Update(workingV2Ref, derivedAppConfigRef, registryRef, updater);
    bump((n) => n + 1);
  }, []);
  return (
    <>
      <LayersTab config={workingV2Ref.current} updateConfig={updateConfig} />
      <pre data-testid="committed-illumination">
        {JSON.stringify(workingV2Ref.current.scene?.illumination ?? null)}
      </pre>
    </>
  );
}

describe("LayersTab base-map presentation persistence", () => {
  afterEach(() => {
    cleanup();
  });

  it("switching map id restores the selected map family's saved presentation", async () => {
    const user = userEvent.setup();
    const initial = normalizeLibrationConfig({
      ...defaultLibrationConfigV2(),
      scene: {
        ...defaultLibrationConfigV2().scene!,
        baseMap: {
          ...defaultLibrationConfigV2().scene!.baseMap,
          id: "equirect-world-topography-v1",
          presentationByMapId: {
            "equirect-world-topography-v1": { brightness: 1.1, contrast: 1.1, gamma: 1.1, saturation: 1.1 },
            "equirect-world-geology-v1": { brightness: 1.6, contrast: 1.4, gamma: 1.3, saturation: 0.8 },
          },
        },
      },
    });
    render(<LayersTabHarness initial={initial} />);

    const styleSelect = screen.getByLabelText("Map style");
    await user.selectOptions(styleSelect, "equirect-world-geology-v1");
    expect((screen.getByTestId("config-bm-pres-brightness-number") as HTMLInputElement).value).toBe("1.60");
    expect(readSceneBaseMapState().id).toBe("equirect-world-geology-v1");
  });

  it("editing display controls updates only the current map id entry", async () => {
    const user = userEvent.setup();
    render(<LayersTabHarness initial={defaultLibrationConfigV2()} />);

    const styleSelect = screen.getByLabelText("Map style");
    await user.selectOptions(styleSelect, "equirect-world-blue-marble-bm-v1");
    const brightnessInput = screen.getByTestId("config-bm-pres-brightness-number");
    await user.clear(brightnessInput);
    await user.type(brightnessInput, "1.25");
    fireEvent.blur(brightnessInput);

    const state = readSceneBaseMapState();
    expect(state.presentationByMapId?.["equirect-world-blue-marble-bm-v1"]?.brightness).toBe(1.25);
    expect(state.presentationByMapId?.["equirect-world-legacy-v1"]?.brightness).toBe(1);
  });

  it("reset display affects only the selected map-family entry", async () => {
    const user = userEvent.setup();
    const initial = normalizeLibrationConfig({
      ...defaultLibrationConfigV2(),
      scene: {
        ...defaultLibrationConfigV2().scene!,
        baseMap: {
          ...defaultLibrationConfigV2().scene!.baseMap,
          id: "equirect-world-topography-v1",
          presentationByMapId: {
            "equirect-world-topography-v1": { brightness: 1.4, contrast: 1.2, gamma: 1.2, saturation: 1.2 },
            "equirect-world-geology-v1": { brightness: 1.7, contrast: 1.4, gamma: 1.3, saturation: 1.1 },
          },
        },
      },
    });
    render(<LayersTabHarness initial={initial} />);

    await user.click(screen.getByRole("button", { name: "Reset base map display to defaults" }));
    const state = readSceneBaseMapState();
    expect(state.presentationByMapId?.["equirect-world-topography-v1"]).toEqual({
      brightness: 1,
      contrast: 1,
      gamma: 1,
      saturation: 1,
    });
    expect(state.presentationByMapId?.["equirect-world-geology-v1"]).toEqual({
      brightness: 1.7,
      contrast: 1.4,
      gamma: 1.3,
      saturation: 1.1,
    });
  });

  it("emissive night-lights mode change preserves moonlight, assetId, and presentation tuning", async () => {
    const user = userEvent.setup();
    const assetId = "equirect-world-night-lights-viirs-v1";
    const initial = normalizeLibrationConfig({
      ...defaultLibrationConfigV2(),
      scene: {
        ...defaultLibrationConfigV2().scene!,
        illumination: {
          moonlight: { mode: "natural" },
          emissiveNightLights: {
            mode: "natural",
            assetId,
            presentation: { intensity: 2.2, driverExponent: 0.42 },
          },
        },
      },
    });
    render(<LayersTabHarness initial={initial} />);

    const sel = screen.getByLabelText("Night lights appearance");
    await user.selectOptions(sel, "enhanced");

    const ill = readIlluminationState();
    expect(ill?.moonlight?.mode).toBe("natural");
    expect(ill?.emissiveNightLights?.mode).toBe("enhanced");
    expect(ill?.emissiveNightLights?.assetId).toBe(assetId);
    expect(ill?.emissiveNightLights?.presentation?.intensity).toBe(2.2);
    expect(ill?.emissiveNightLights?.presentation?.driverExponent).toBe(0.42);
  });

  it("Night lights change through commitWorkingV2Update persists scene.illumination in working v2", async () => {
    const user = userEvent.setup();
    const initial = normalizeLibrationConfig(defaultLibrationConfigV2());
    render(<LayersTabCommitHarness initial={initial} />);

    await user.selectOptions(screen.getByLabelText("Night lights appearance"), "illustrative");

    const committed = JSON.parse(screen.getByTestId("committed-illumination").textContent ?? "null") as {
      emissiveNightLights?: { mode: string };
    };
    expect(committed?.emissiveNightLights?.mode).toBe("illustrative");
  });

  it("moonlight mode change preserves emissive night-lights fields", async () => {
    const user = userEvent.setup();
    const initial = normalizeLibrationConfig({
      ...defaultLibrationConfigV2(),
      scene: {
        ...defaultLibrationConfigV2().scene!,
        illumination: {
          moonlight: { mode: "natural" },
          emissiveNightLights: {
            mode: "illustrative",
            assetId: DEFAULT_EMISSIVE_NIGHT_LIGHTS_ASSET_ID,
            presentation: { intensity: 1.8, driverExponent: 0.88 },
          },
        },
      },
    });
    render(<LayersTabHarness initial={initial} />);

    await user.selectOptions(screen.getByLabelText("Moonlight appearance"), "enhanced");

    const ill = readIlluminationState();
    expect(ill?.moonlight?.mode).toBe("enhanced");
    expect(ill?.emissiveNightLights?.mode).toBe("illustrative");
    expect(ill?.emissiveNightLights?.assetId).toBe(DEFAULT_EMISSIVE_NIGHT_LIGHTS_ASSET_ID);
    expect(ill?.emissiveNightLights?.presentation?.intensity).toBe(1.8);
    expect(ill?.emissiveNightLights?.presentation?.driverExponent).toBe(0.88);
  });

  it("reset night-light presentation restores defaults without changing mode or asset id", async () => {
    const user = userEvent.setup();
    const initial = normalizeLibrationConfig({
      ...defaultLibrationConfigV2(),
      scene: {
        ...defaultLibrationConfigV2().scene!,
        illumination: {
          moonlight: { mode: "natural" },
          emissiveNightLights: {
            mode: "enhanced",
            assetId: DEFAULT_EMISSIVE_NIGHT_LIGHTS_ASSET_ID,
            presentation: { intensity: 3.5, driverExponent: 0.9 },
          },
        },
      },
    });
    render(<LayersTabHarness initial={initial} />);

    await user.click(screen.getByRole("button", { name: "Reset night-light presentation" }));

    const ill = readIlluminationState();
    expect(ill?.emissiveNightLights?.mode).toBe("enhanced");
    expect(ill?.emissiveNightLights?.assetId).toBe(DEFAULT_EMISSIVE_NIGHT_LIGHTS_ASSET_ID);
    expect(ill?.emissiveNightLights?.presentation).toEqual({
      ...DEFAULT_EMISSIVE_NIGHT_LIGHTS_PRESENTATION,
    });
  });
});
