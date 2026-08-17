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
  applyLayerEnableFlagsToScene,
} from "../../config/v2/sceneConfig";
import { LayersTab } from "./LayersTab";
import { LAYERS_TOPIC_IDS, type LayersTopicId } from "./layersTopicTypes";

function selectLayersTopic(topic: LayersTopicId): void {
  fireEvent.change(screen.getByTestId("layers-topic-select"), { target: { value: topic } });
}

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
    selectLayersTopic("map");

    const styleSelect = screen.getByLabelText("Map style");
    await user.selectOptions(styleSelect, "equirect-world-geology-v1");
    expect((screen.getByTestId("config-bm-pres-brightness-number") as HTMLInputElement).value).toBe("1.60");
    expect(readSceneBaseMapState().id).toBe("equirect-world-geology-v1");
  });

  it("editing display controls updates only the current map id entry", async () => {
    const user = userEvent.setup();
    render(<LayersTabHarness initial={defaultLibrationConfigV2()} />);
    selectLayersTopic("map");

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
    selectLayersTopic("map");

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
          ...defaultLibrationConfigV2().scene!.illumination,
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
    selectLayersTopic("illumination");

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
    selectLayersTopic("illumination");

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
          ...defaultLibrationConfigV2().scene!.illumination,
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
    selectLayersTopic("illumination");

    await user.selectOptions(screen.getByLabelText("Moonlight appearance"), "enhanced");

    const ill = readIlluminationState();
    expect(ill?.moonlight?.mode).toBe("enhanced");
    expect(ill?.emissiveNightLights?.mode).toBe("illustrative");
    expect(ill?.emissiveNightLights?.assetId).toBe(DEFAULT_EMISSIVE_NIGHT_LIGHTS_ASSET_ID);
    expect(ill?.emissiveNightLights?.presentation?.intensity).toBe(1.8);
    expect(ill?.emissiveNightLights?.presentation?.driverExponent).toBe(0.88);
  });

  it("renders clear numeric tuning labels and reset control copy", () => {
    render(<LayersTabHarness initial={normalizeLibrationConfig(defaultLibrationConfigV2())} />);
    selectLayersTopic("illumination");
    expect(screen.getByText("Intensity value (0–4)")).toBeTruthy();
    expect(screen.getByText("Lift value (0.35–1)")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reset night-light tuning" })).toBeTruthy();
  });

  it("reset night-light tuning restores defaults without changing mode or asset id", async () => {
    const user = userEvent.setup();
    const initial = normalizeLibrationConfig({
      ...defaultLibrationConfigV2(),
      scene: {
        ...defaultLibrationConfigV2().scene!,
        illumination: {
          ...defaultLibrationConfigV2().scene!.illumination,
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
    selectLayersTopic("illumination");

    await user.click(screen.getByRole("button", { name: "Reset night-light tuning" }));

    const ill = readIlluminationState();
    expect(ill?.emissiveNightLights?.mode).toBe("enhanced");
    expect(ill?.emissiveNightLights?.assetId).toBe(DEFAULT_EMISSIVE_NIGHT_LIGHTS_ASSET_ID);
    expect(ill?.emissiveNightLights?.presentation).toEqual({
      ...DEFAULT_EMISSIVE_NIGHT_LIGHTS_PRESENTATION,
    });
  });
});

describe("LayersTab lunar ground track stroke colors", () => {
  afterEach(() => {
    cleanup();
  });

  it("updates independent past and future colors on the scene row", () => {
    function Harness() {
      const [config, setConfig] = useState(() => normalizeLibrationConfig(defaultLibrationConfigV2()));
      const updateConfig = useCallback((updater: (draft: LibrationConfigV2) => void) => {
        setConfig((prev) => {
          const draft = normalizeLibrationConfig(prev);
          updater(draft);
          return normalizeLibrationConfig(draft);
        });
      }, []);
      const row = config.scene?.layers.find((l) => l.id === "lunarGroundTrack");
      const params = row?.source.kind === "derived" ? row.source.parameters : {};
      return (
        <>
          <LayersTab config={config} updateConfig={updateConfig} />
          <pre data-testid="lunar-params">{JSON.stringify(params)}</pre>
        </>
      );
    }
    render(<Harness />);
    selectLayersTopic("astronomyPaths");
    const past = screen.getByLabelText("Lunar ground track past color") as HTMLInputElement;
    const future = screen.getByLabelText("Lunar ground track future color") as HTMLInputElement;
    expect(past.value).toBe("#aacdf0");
    expect(future.value).toBe("#aacdf0");
    fireEvent.change(past, { target: { value: "#ff0000" } });
    fireEvent.change(future, { target: { value: "#00ff00" } });
    const params = JSON.parse(screen.getByTestId("lunar-params").textContent ?? "{}") as {
      pastColor?: string;
      futureColor?: string;
    };
    expect(params.pastColor).toBe("#ff0000");
    expect(params.futureColor).toBe("#00ff00");
  });
});

describe("LayersTab Moon and astronomy path styling", () => {
  afterEach(() => {
    cleanup();
  });

  it("updates Moon, locus, and analemma styles independently", () => {
    function Harness() {
      const [config, setConfig] = useState(() => normalizeLibrationConfig(defaultLibrationConfigV2()));
      const updateConfig = useCallback((updater: (draft: LibrationConfigV2) => void) => {
        setConfig((prev) => {
          const draft = normalizeLibrationConfig(prev);
          updater(draft);
          return normalizeLibrationConfig(draft);
        });
      }, []);
      const moon = config.scene?.layers.find((l) => l.id === "sublunarMarker");
      const locus = config.scene?.layers.find((l) => l.id === "lunarLocus");
      const analemma = config.scene?.layers.find((l) => l.id === "solarAnalemma");
      return (
        <>
          <LayersTab config={config} updateConfig={updateConfig} />
          <pre data-testid="moon-params">
            {JSON.stringify(moon?.source.kind === "derived" ? moon.source.parameters : {})}
          </pre>
          <pre data-testid="locus-params">
            {JSON.stringify(locus?.source.kind === "derived" ? locus.source.parameters : {})}
          </pre>
          <pre data-testid="analemma-params">
            {JSON.stringify(analemma?.source.kind === "derived" ? analemma.source.parameters : {})}
          </pre>
        </>
      );
    }
    render(<Harness />);
    selectLayersTopic("moonAndLibration");
    const libColor = screen.getByLabelText("Libration color") as HTMLInputElement;
    expect(libColor.value).toBe("#c5d4e8");
    fireEvent.change(libColor, { target: { value: "#abcdef" } });
    fireEvent.change(screen.getByLabelText("Moon size"), { target: { value: "large" } });
    fireEvent.change(screen.getByLabelText("Libration style"), { target: { value: "crosshair" } });
    selectLayersTopic("astronomyPaths");
    const locusColor = screen.getByLabelText("Lunar locus color") as HTMLInputElement;
    const analemmaColor = screen.getByLabelText("Solar analemma color") as HTMLInputElement;
    expect(locusColor.value).toBe("#1c2638");
    expect(analemmaColor.value).toBe("#ffc878");
    fireEvent.change(locusColor, { target: { value: "#112233" } });
    fireEvent.change(analemmaColor, { target: { value: "#fedcba" } });
    fireEvent.change(screen.getByLabelText("Lunar locus thickness"), { target: { value: "thick" } });
    fireEvent.change(screen.getByLabelText("Solar analemma thickness"), { target: { value: "thin" } });
    const moon = JSON.parse(screen.getByTestId("moon-params").textContent ?? "{}") as Record<string, unknown>;
    const locus = JSON.parse(screen.getByTestId("locus-params").textContent ?? "{}") as Record<string, unknown>;
    const analemma = JSON.parse(screen.getByTestId("analemma-params").textContent ?? "{}") as Record<
      string,
      unknown
    >;
    expect(moon.librationColor).toBe("#abcdef");
    expect(moon.size).toBe("large");
    expect(moon.librationStyle).toBe("crosshair");
    expect(moon.librationOrientation).toBe("observer");
    expect(moon.librationUseReferenceCity).toBe(true);
    selectLayersTopic("moonAndLibration");
    fireEvent.change(screen.getByLabelText("Libration orientation"), { target: { value: "map" } });
    expect((screen.getByLabelText("Use reference city") as HTMLInputElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Libration orientation"), { target: { value: "observer" } });
    fireEvent.click(screen.getByLabelText("Use reference city"));
    const moonAfter = JSON.parse(screen.getByTestId("moon-params").textContent ?? "{}") as Record<
      string,
      unknown
    >;
    expect(moonAfter.librationOrientation).toBe("observer");
    expect(moonAfter.librationUseReferenceCity).toBe(false);
    expect(moonAfter.librationColor).toBe("#abcdef");
    const locusAfter = JSON.parse(screen.getByTestId("locus-params").textContent ?? "{}") as Record<
      string,
      unknown
    >;
    const analemmaAfter = JSON.parse(screen.getByTestId("analemma-params").textContent ?? "{}") as Record<
      string,
      unknown
    >;
    expect(locusAfter.strokeColor).toBe("#112233");
    expect(analemmaAfter.strokeColor).toBe("#fedcba");
    expect(locus.strokeColor).toBe("#112233");
    expect(locus.strokeThickness).toBe("thick");
    expect(analemma.strokeColor).toBe("#fedcba");
    expect(analemma.strokeThickness).toBe("thin");
    expect(moon.librationColor).not.toBe(locus.strokeColor);
    expect(locus.strokeColor).not.toBe(analemma.strokeColor);
  });
});

describe("LayersTab eclipse alignment", () => {
  afterEach(() => {
    cleanup();
  });

  it("defaults alignment on and can disable the beam without turning off Solar eclipses", async () => {
    const user = userEvent.setup();
    render(<LayersTabHarness initial={normalizeLibrationConfig(defaultLibrationConfigV2())} />);
    selectLayersTopic("eclipse");
    const master = screen.getByLabelText("Eclipse alignment effects") as HTMLInputElement;
    const solarBeam = screen.getByLabelText("Solar alignment beam") as HTMLInputElement;
    const lunarBeam = screen.getByLabelText("Lunar alignment beam") as HTMLInputElement;
    const intensity = screen.getByLabelText("Alignment intensity") as HTMLSelectElement;
    expect(master.checked).toBe(true);
    expect(solarBeam.checked).toBe(true);
    expect(lunarBeam.checked).toBe(true);
    expect(intensity.value).toBe("normal");
    await user.click(master);
    expect(master.checked).toBe(false);
    selectLayersTopic("layerMasters");
    const solar = screen.getByLabelText("Solar eclipses") as HTMLInputElement;
    expect(solar.checked).toBe(true);
    await user.click(solar);
    expect(solar.checked).toBe(false);
    selectLayersTopic("eclipse");
    expect((screen.getByLabelText("Eclipse alignment effects") as HTMLInputElement).checked).toBe(false);
  });
});

describe("LayersTab reference-city eclipse circumstances", () => {
  afterEach(() => {
    cleanup();
  });

  it("defaults details and chrome status on and can disable them independently of Solar eclipses", async () => {
    const user = userEvent.setup();
    render(<LayersTabHarness initial={normalizeLibrationConfig(defaultLibrationConfigV2())} />);
    selectLayersTopic("eclipse");
    const details = screen.getByLabelText("Reference-city eclipse details") as HTMLInputElement;
    const chrome = screen.getByLabelText("Persistent eclipse status") as HTMLInputElement;
    expect(details.checked).toBe(true);
    expect(chrome.checked).toBe(true);
    await user.click(details);
    await user.click(chrome);
    expect(details.checked).toBe(false);
    expect(chrome.checked).toBe(false);
    selectLayersTopic("layerMasters");
    const solar = screen.getByLabelText("Solar eclipses") as HTMLInputElement;
    expect(solar.checked).toBe(true);
    await user.click(solar);
    expect(solar.checked).toBe(false);
    selectLayersTopic("eclipse");
    expect((screen.getByLabelText("Reference-city eclipse details") as HTMLInputElement).checked).toBe(
      false,
    );
  });

  it("keeps Layers eclipse controls-only during an active solar event", () => {
    const initial = normalizeLibrationConfig(defaultLibrationConfigV2());
    initial.layers.solarEclipse = true;
    initial.scene = applyLayerEnableFlagsToScene(initial.scene!, initial.layers);
    function Harness() {
      const [config, setConfig] = useState(initial);
      return (
        <LayersTab
          config={config}
          updateConfig={(updater) => {
            const draft = normalizeLibrationConfig(config);
            updater(draft);
            setConfig(normalizeLibrationConfig(draft));
          }}
          productInstantMs={Date.parse("2024-04-08T18:17:15.000Z")}
        />
      );
    }
    render(<Harness />);
    selectLayersTopic("eclipse");
    expect(screen.queryByTestId("eclipse-event-information")).toBeNull();
    expect(screen.queryByTestId("eclipse-circumstances-details")).toBeNull();
    expect(screen.getByLabelText("Event information")).toBeTruthy();
    expect(screen.getByLabelText("Reference-city eclipse details")).toBeTruthy();
  });
});

describe("LayersTab eclipse product polish", () => {
  afterEach(() => {
    cleanup();
  });

  it("disables solar forecast children when horizon is live only", async () => {
    const user = userEvent.setup();
    render(<LayersTabHarness initial={normalizeLibrationConfig(defaultLibrationConfigV2())} />);
    selectLayersTopic("eclipse");
    const horizon = screen.getByLabelText("Solar forecast horizon") as HTMLSelectElement;
    await user.selectOptions(horizon, "0");
    expect((screen.getByLabelText("Forecast corridor") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText("Forecast partial region") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText("Forecast partial region") as HTMLInputElement).title).toMatch(
      /Hidden once the eclipse is active/,
    );
    expect((screen.getByLabelText("Live central line") as HTMLInputElement).disabled).toBe(false);
    expect((screen.getByLabelText("Active eclipse shading") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("Eclipse shading intensity") as HTMLSelectElement).value).toBe("normal");
  });

  it("defaults lunar forecast horizon to 7 days and disables forecast children when live only", async () => {
    const user = userEvent.setup();
    render(<LayersTabHarness initial={normalizeLibrationConfig(defaultLibrationConfigV2())} />);
    selectLayersTopic("layerMasters");
    const lunar = screen.getByLabelText("Lunar eclipses") as HTMLInputElement;
    expect(lunar.checked).toBe(true);
    selectLayersTopic("eclipse");
    const horizon = screen.getByLabelText("Lunar forecast horizon") as HTMLSelectElement;
    expect(horizon.value).toBe("7");
    await user.selectOptions(horizon, "0");
    expect((screen.getByLabelText("Forecast Moon-visible region") as HTMLInputElement).disabled).toBe(
      true,
    );
    expect((screen.getByLabelText("Forecast Moon-visible boundary") as HTMLInputElement).disabled).toBe(
      true,
    );
    expect((screen.getByLabelText("Moon Earth-shadow treatment") as HTMLInputElement).disabled).toBe(
      false,
    );
  });

  it("keeps event labels independent of event information", async () => {
    const user = userEvent.setup();
    render(<LayersTabHarness initial={normalizeLibrationConfig(defaultLibrationConfigV2())} />);
    selectLayersTopic("eclipse");
    const info = screen.getByLabelText("Event information") as HTMLInputElement;
    const labels = screen.getByLabelText("Event labels") as HTMLInputElement;
    expect(info.checked).toBe(true);
    expect(labels.checked).toBe(true);
    await user.click(info);
    expect(info.checked).toBe(false);
    expect(labels.checked).toBe(true);
    await user.click(labels);
    expect(labels.checked).toBe(false);
    expect(info.checked).toBe(false);
  });

  it("does not leak solar forecast color into lunar visibility color", () => {
    render(<LayersTabHarness initial={normalizeLibrationConfig(defaultLibrationConfigV2())} />);
    selectLayersTopic("eclipse");
    const solarColor = screen.getByLabelText("Solar forecast color") as HTMLInputElement;
    const lunarColor = screen.getByLabelText("Lunar visibility color") as HTMLInputElement;
    const beforeLunar = lunarColor.value;
    fireEvent.change(solarColor, { target: { value: "#112233" } });
    expect(solarColor.value).toBe("#112233");
    expect(lunarColor.value).toBe(beforeLunar);
  });

  it("defaults the live eclipse position marker on with size and color controls", async () => {
    const user = userEvent.setup();
    render(<LayersTabHarness initial={normalizeLibrationConfig(defaultLibrationConfigV2())} />);
    selectLayersTopic("eclipse");
    const toggle = screen.getByLabelText("Live eclipse position") as HTMLInputElement;
    const size = screen.getByLabelText("Live position size") as HTMLSelectElement;
    const color = screen.getByLabelText("Live position color") as HTMLInputElement;
    expect(toggle.checked).toBe(true);
    expect(size.value).toBe("normal");
    expect(color.value).toBe("#d45a3c");
    await user.click(toggle);
    expect(toggle.checked).toBe(false);
    expect(size.disabled).toBe(true);
    expect(color.disabled).toBe(true);
  });
});

describe("LayersTab topic navigation", () => {
  afterEach(() => {
    cleanup();
  });

  it("defaults to Layer masters and unmounts other topics", () => {
    render(<LayersTabHarness initial={normalizeLibrationConfig(defaultLibrationConfigV2())} />);
    expect(screen.getByTestId("layers-topic-select")).toHaveValue("layerMasters");
    expect(screen.getByTestId("layers-topic-layer-masters")).toBeInTheDocument();
    expect(screen.getByLabelText("Solar eclipses")).toBeInTheDocument();
    expect(screen.queryByLabelText("Map style")).toBeNull();
    expect(screen.queryByLabelText("Moonlight appearance")).toBeNull();
    expect(screen.queryByLabelText("Event information")).toBeNull();
    expect(screen.queryByLabelText("Libration color")).toBeNull();
    expect(screen.queryByLabelText("Overlay combined readability veil scale")).toBeNull();
  });

  it("switching topics unmounts the previous topic and does not mutate config", async () => {
    const user = userEvent.setup();
    render(<LayersTabHarness initial={normalizeLibrationConfig(defaultLibrationConfigV2())} />);
    const solar = screen.getByLabelText("Solar eclipses") as HTMLInputElement;
    expect(solar.checked).toBe(true);
    await user.click(solar);
    expect(solar.checked).toBe(false);
    const illuminationBefore = screen.getByTestId("illumination-state").textContent;
    selectLayersTopic("map");
    expect(screen.queryByTestId("layers-topic-layer-masters")).toBeNull();
    expect(screen.getByTestId("layers-topic-map")).toBeInTheDocument();
    expect(screen.getByLabelText("Map style")).toBeInTheDocument();
    selectLayersTopic("layerMasters");
    expect((screen.getByLabelText("Solar eclipses") as HTMLInputElement).checked).toBe(false);
    expect(screen.getByTestId("illumination-state").textContent).toBe(illuminationBefore);
  });

  it("Advanced topic shows overlay-readability pilots and not layer masters", () => {
    render(<LayersTabHarness initial={normalizeLibrationConfig(defaultLibrationConfigV2())} />);
    selectLayersTopic("advanced");
    expect(screen.getByTestId("layers-topic-advanced")).toBeInTheDocument();
    expect(screen.getByLabelText("Overlay combined readability veil scale")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset overlay readability" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Solar eclipses")).toBeNull();
    expect(screen.queryByLabelText("Moonlight appearance")).toBeNull();
  });

  it("keeps Layer masters default, topic order, and sticky selector outside the heading", () => {
    render(<LayersTabHarness initial={normalizeLibrationConfig(defaultLibrationConfigV2())} />);
    const select = screen.getByTestId("layers-topic-select") as HTMLSelectElement;
    expect(select).toHaveValue("layerMasters");
    expect([...select.options].map((option) => option.value)).toEqual([...LAYERS_TOPIC_IDS]);
    const nav = screen.getByTestId("layers-topic-nav");
    expect(nav.classList.contains("config-topic-nav")).toBe(true);
    expect(nav.querySelector("#config-layers-topic")).toBe(select);
    expect(screen.getByRole("heading", { name: "Scene layers" }).closest(".config-topic-nav")).toBeNull();
  });

  it("resets the tab-panel scroll on topic change but not on setting edits", () => {
    render(
      <div className="config-tab-panel" data-testid="layers-scroll-host">
        <LayersTabHarness initial={normalizeLibrationConfig(defaultLibrationConfigV2())} />
      </div>,
    );
    const host = screen.getByTestId("layers-scroll-host");
    let scrollTopValue = 0;
    Object.defineProperty(host, "scrollTop", {
      configurable: true,
      get: () => scrollTopValue,
      set: (next: number) => {
        scrollTopValue = next;
      },
    });

    selectLayersTopic("advanced");
    expect(scrollTopValue).toBe(0);
    expect(screen.getByTestId("layers-topic-advanced")).toBeInTheDocument();

    scrollTopValue = 420;
    const veil = screen.getByLabelText("Overlay combined readability veil scale") as HTMLInputElement;
    fireEvent.change(veil, { target: { value: "0.4" } });
    expect(veil.value).toBe("0.4");
    expect(scrollTopValue).toBe(420);
    const illuminationAfterEdit = screen.getByTestId("illumination-state").textContent;

    selectLayersTopic("moonAndLibration");
    expect(scrollTopValue).toBe(0);
    expect(screen.getByTestId("layers-topic-moon-and-libration")).toBeInTheDocument();
    expect(screen.queryByTestId("layers-topic-advanced")).toBeNull();
    expect(screen.getByTestId("illumination-state").textContent).toBe(illuminationAfterEdit);
  });
});
