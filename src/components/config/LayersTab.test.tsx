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
import { useCallback, useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { defaultLibrationConfigV2, normalizeLibrationConfig, type LibrationConfigV2 } from "../../config/v2/librationConfig";
import { DEFAULT_EMISSIVE_NIGHT_LIGHTS_ASSET_ID } from "../../config/v2/sceneConfig";
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
  emissiveNightLights?: { mode: string; assetId: string };
} | null {
  return JSON.parse(screen.getByTestId("illumination-state").textContent ?? "null");
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

  it("emissive night-lights mode change preserves moonlight and emissive assetId", async () => {
    const user = userEvent.setup();
    const assetId = "equirect-world-night-lights-viirs-v1";
    const initial = normalizeLibrationConfig({
      ...defaultLibrationConfigV2(),
      scene: {
        ...defaultLibrationConfigV2().scene!,
        illumination: {
          moonlight: { mode: "natural" },
          emissiveNightLights: { mode: "natural", assetId },
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
  });
});
