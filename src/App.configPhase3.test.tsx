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
import { useCallback, useReducer } from "react";
import type { MutableRefObject, RefObject } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { getActiveAppConfig } from "./config/displayPresets";
import {
  appConfigToV2,
  normalizeLibrationConfig,
  v2ToAppConfig,
} from "./config/v2/librationConfig";
import type { LayerEnableFlags } from "./config/appConfig";
import { DEFAULT_DATA_CONFIG, DEMO_TIME_SPEED_MAX } from "./config/appConfig";
import type { LibrationConfigV2 } from "./config/v2/librationConfig";
import { WORKING_V2_LOCAL_STORAGE_KEY } from "./config/v2/workingV2Persistence";
import { ConfigShell } from "./components/config/ConfigShell";
import { CONFIG_TAB_DEFS } from "./components/config/configTabs";
import { ALLOW_PHASE3_MUTATIONS } from "./components/config/phase3Flags";
import * as appBootstrap from "./app/bootstrap";
import { createLayerRegistryFromConfig } from "./app/bootstrap";
import {
  commitWorkingV2Update,
  deriveAppConfigFromV2,
} from "./app/workingV2Commit";
import { resolveCitiesForPins } from "./config/appConfig";
import * as workingV2Commit from "./app/workingV2Commit";
import type { LayerRegistry } from "./layers/LayerRegistry";

const configSources = import.meta.glob<string>("./components/config/**/*.{ts,tsx}", {
  eager: true,
  query: "?raw",
  import: "default",
});

function assertNoRendererImportInConfig(source: string, label: string): void {
  const forbidden = ["from \"../renderer", "from '../renderer", "from \"../../renderer", "from '../../renderer", "/renderer/"];
  for (const frag of forbidden) {
    if (source.includes(frag)) {
      throw new Error(`Unexpected renderer import in ${label}: contains "${frag}"`);
    }
  }
}

/**
 * Mirrors App’s `bumpConfigView` after {@link commitWorkingV2Update} so tests that drive
 * multi-step Chrome UI see updated controls (ref mutation alone does not re-render).
 */
function ConfigShellWithCommitRerender({
  workingV2Ref,
  derivedAppConfigRef,
  registryRef,
}: {
  workingV2Ref: RefObject<LibrationConfigV2 | null>;
  derivedAppConfigRef: MutableRefObject<ReturnType<typeof deriveAppConfigFromV2>>;
  registryRef: MutableRefObject<LayerRegistry>;
}) {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const updateConfig = useCallback(
    (updater: (draft: LibrationConfigV2) => void) => {
      commitWorkingV2Update(workingV2Ref, derivedAppConfigRef, registryRef, updater);
      bump();
    },
    [workingV2Ref, derivedAppConfigRef, registryRef],
  );
  return <ConfigShell workingV2Ref={workingV2Ref} updateConfig={updateConfig} />;
}

describe("LibrationConfig v2 Phase 3 (config UI shell)", () => {
  afterEach(() => {
    cleanup();
  });

  it("exposes Phase 3b mutations guard as true", () => {
    expect(ALLOW_PHASE3_MUTATIONS).toBe(true);
  });

  it("config shell renders tabs and section headings", () => {
    const working: LibrationConfigV2 = normalizeLibrationConfig(
      appConfigToV2(getActiveAppConfig()),
    );
    const ref: { current: LibrationConfigV2 | null } = { current: working };
    render(<ConfigShell workingV2Ref={ref} updateConfig={() => {}} />);

    for (const tab of CONFIG_TAB_DEFS) {
      expect(
        screen.getByRole("tab", { name: tab.label }),
      ).toBeInTheDocument();
    }

    expect(screen.getByRole("heading", { name: "Scene layers" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Configuration" })).toBeInTheDocument();
  });

  it("tab switching shows the expected panel content", async () => {
    const user = userEvent.setup();
    const working: LibrationConfigV2 = normalizeLibrationConfig(
      appConfigToV2(getActiveAppConfig()),
    );
    const ref: { current: LibrationConfigV2 | null } = { current: working };
    render(<ConfigShell workingV2Ref={ref} />);

    await user.click(screen.getByRole("tab", { name: "General" }));
    expect(screen.getByRole("heading", { name: "Document" })).toBeVisible();

    await user.click(screen.getByRole("tab", { name: "Pins" }));
    const panels = screen.getAllByRole("tabpanel");
    const pinsPanel = panels.find((p) => !p.hasAttribute("hidden"));
    expect(pinsPanel).toBeDefined();
    expect(
      within(pinsPanel!).getByRole("heading", { name: "Reference pins" }),
    ).toBeVisible();
    expect(within(pinsPanel!).getByRole("combobox", { name: "Pin scale" })).toBeDisabled();
  });

  it("Data tab: noop updateConfig leaves working v2 and derived AppConfig unchanged", async () => {
    const user = userEvent.setup();
    const working: LibrationConfigV2 = normalizeLibrationConfig(
      appConfigToV2(getActiveAppConfig()),
    );
    const ref: { current: LibrationConfigV2 | null } = { current: working };
    const snapshot = structuredClone(working);
    const derivedBefore = v2ToAppConfig(working);

    render(<ConfigShell workingV2Ref={ref} updateConfig={() => {}} />);

    await user.click(screen.getByRole("tab", { name: "Data" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Data pipeline mode" }), "demo");
    await user.click(screen.getByRole("checkbox", { name: "Show data annotations when available" }));

    expect(ref.current).not.toBeNull();
    expect(ref.current).toEqual(snapshot);
    expect(v2ToAppConfig(ref.current!)).toEqual(derivedBefore);
  });

  it("Data tab: mode and annotations update working v2 and derived AppConfig", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2019-06-15T10:00:00.000Z"));
    try {
      const working: LibrationConfigV2 = normalizeLibrationConfig(
        appConfigToV2(getActiveAppConfig()),
      );
      const ref: { current: LibrationConfigV2 | null } = { current: working };
      const derivedAppConfigRef = {
        current: deriveAppConfigFromV2(working),
      };
      const registryRef = {
        current: createLayerRegistryFromConfig(derivedAppConfigRef.current),
      };

      render(
        <ConfigShellWithCommitRerender
          workingV2Ref={ref}
          derivedAppConfigRef={derivedAppConfigRef}
          registryRef={registryRef}
        />,
      );

      fireEvent.click(screen.getByRole("tab", { name: "Data" }));
      fireEvent.change(screen.getByRole("combobox", { name: "Data pipeline mode" }), {
        target: { value: "demo" },
      });
      fireEvent.click(screen.getByRole("checkbox", { name: "Show data annotations when available" }));

      expect(ref.current!.data.mode).toBe("demo");
      expect(ref.current!.data.showDataAnnotations).toBe(true);
      expect(derivedAppConfigRef.current.data).toEqual({
        ...DEFAULT_DATA_CONFIG,
        mode: "demo",
        showDataAnnotations: true,
        demoTime: {
          ...DEFAULT_DATA_CONFIG.demoTime,
          startIsoUtc: "2019-06-15T10:00:00.000Z",
        },
      });
      expect(v2ToAppConfig(ref.current!)).toEqual(derivedAppConfigRef.current);
    } finally {
      vi.useRealTimers();
    }
  });

  it("Data tab: demo time controls update working v2 via updateConfig", async () => {
    /** Static→Demo seeds `startIsoUtc` from `Date.now()`; merges preserve sub-second ms — stub for a deterministic final instant. */
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(Date.UTC(1999, 5, 15, 0, 0, 0, 0));
    try {
      const user = userEvent.setup();
      const working: LibrationConfigV2 = normalizeLibrationConfig(
        appConfigToV2(getActiveAppConfig()),
      );
      /** Pin display-time frame to UTC so typed `06:00:00` commits as `06:00` UTC (deterministic). */
      working.chrome.displayTime.topBandMode = "utc24";
      working.chrome.displayTime.referenceTimeZone = { source: "fixed", timeZone: "UTC" };
      const ref: { current: LibrationConfigV2 | null } = { current: working };
      const derivedAppConfigRef = {
        current: deriveAppConfigFromV2(working),
      };
      const registryRef = {
        current: createLayerRegistryFromConfig(derivedAppConfigRef.current),
      };

      render(
        <ConfigShellWithCommitRerender
          workingV2Ref={ref}
          derivedAppConfigRef={derivedAppConfigRef}
          registryRef={registryRef}
        />,
      );

      await user.click(screen.getByRole("tab", { name: "Data" }));
      await user.selectOptions(screen.getByRole("combobox", { name: "Data pipeline mode" }), "demo");
      await user.click(screen.getByRole("checkbox", { name: "Enable demo time" }));
      fireEvent.change(screen.getByLabelText("Demo start date"), {
        target: { value: "2045-07-20" },
      });
      const startTime = screen.getByLabelText("Demo start time");
      await user.click(startTime);
      await user.clear(startTime);
      await user.type(startTime, "06:00:00");
      fireEvent.blur(startTime);
      const speedInput = screen.getByRole("spinbutton", { name: "Playback speed" });
      expect(speedInput).toHaveAttribute("max", String(DEMO_TIME_SPEED_MAX));
      fireEvent.change(speedInput, { target: { value: "120" } });

      expect(ref.current!.data.demoTime.enabled).toBe(true);
      expect(ref.current!.data.demoTime.startIsoUtc).toBe("2045-07-20T06:00:00.000Z");
      expect(ref.current!.data.demoTime.speedMultiplier).toBe(120);
      expect(derivedAppConfigRef.current.data.demoTime).toEqual(ref.current!.data.demoTime);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("Data tab: demo playback transport does not call commitWorkingV2Update", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(workingV2Commit, "commitWorkingV2Update");
    localStorage.removeItem(WORKING_V2_LOCAL_STORAGE_KEY);
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Open configuration panel" }));
    await user.click(screen.getByRole("tab", { name: "Data" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Data pipeline mode" }), "demo");
    await user.click(screen.getByRole("checkbox", { name: "Enable demo time" }));
    spy.mockClear();
    await user.click(screen.getByRole("button", { name: "Pause demo playback" }));
    await user.click(screen.getByRole("button", { name: "Resume demo playback" }));
    await user.click(screen.getByRole("button", { name: "Reset demo playback to configured start" }));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("Data tab: reset while paused keeps demo playback paused", async () => {
    const user = userEvent.setup();
    localStorage.removeItem(WORKING_V2_LOCAL_STORAGE_KEY);
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Open configuration panel" }));
    await user.click(screen.getByRole("tab", { name: "Data" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Data pipeline mode" }), "demo");
    await user.click(screen.getByRole("checkbox", { name: "Enable demo time" }));
    const pauseBtn = await screen.findByRole("button", { name: "Pause demo playback" });
    await user.click(pauseBtn);
    expect(screen.getByText("Paused")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reset demo playback to configured start" }));
    expect(screen.getByText("Paused")).toBeInTheDocument();
  });

  it("App mounts with canvas and leaves seeded v2-derived config equivalent to active preset", () => {
    const beforeV2 = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    const beforeDerived = v2ToAppConfig(beforeV2);

    render(<App />);

    const canvas = document.querySelector("canvas.render-canvas");
    expect(canvas).toBeTruthy();
    expect(
      screen.queryByRole("complementary", { name: "Configuration" }),
    ).not.toBeInTheDocument();

    const afterV2 = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    const afterDerived = v2ToAppConfig(afterV2);
    expect(afterV2).toEqual(beforeV2);
    expect(afterDerived).toEqual(beforeDerived);
  });

  it("config shell is hidden by default after App mount", () => {
    render(<App />);
    expect(
      screen.queryByRole("complementary", { name: "Configuration" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open configuration panel" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("launcher opens the configuration panel", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Open configuration panel" }));
    expect(
      screen.getByRole("complementary", { name: "Configuration" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Close configuration panel" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("launcher closes the configuration panel", async () => {
    const user = userEvent.setup();
    render(<App />);
    const launcher = screen.getByRole("button", { name: "Open configuration panel" });
    await user.click(launcher);
    await user.click(screen.getByRole("button", { name: "Close configuration panel" }));
    expect(
      screen.queryByRole("complementary", { name: "Configuration" }),
    ).not.toBeInTheDocument();
  });

  it("c toggles the configuration panel when focus is not in a text entry control", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.keyboard("c");
    expect(
      screen.getByRole("complementary", { name: "Configuration" }),
    ).toBeVisible();
    await user.keyboard("c");
    expect(
      screen.queryByRole("complementary", { name: "Configuration" }),
    ).not.toBeInTheDocument();
  });

  it("Escape closes the configuration panel when it is open", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.keyboard("c");
    expect(
      screen.getByRole("complementary", { name: "Configuration" }),
    ).toBeVisible();
    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("complementary", { name: "Configuration" }),
    ).not.toBeInTheDocument();
  });

  it("does not toggle the panel with c when focus is in a text entry control", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Open configuration panel" }));
    expect(
      screen.getByRole("complementary", { name: "Configuration" }),
    ).toBeVisible();

    const stray = document.createElement("input");
    stray.type = "text";
    document.body.appendChild(stray);
    stray.focus();

    await user.keyboard("c");

    expect(
      screen.getByRole("complementary", { name: "Configuration" }),
    ).toBeVisible();

    stray.remove();
  });

  it("when closed, app-main is the only non-overlay child of app-shell (no docked config column)", () => {
    render(<App />);
    const shell = document.querySelector(".app-shell");
    expect(shell).toBeTruthy();
    const children = Array.from(shell!.children);
    const main = shell!.querySelector(".app-main");
    expect(main).toBeTruthy();
    expect(children).toContain(main);
    expect(children.filter((el) => el.classList.contains("config-overlay-host"))).toHaveLength(
      0,
    );
    expect(
      screen.queryByRole("complementary", { name: "Configuration" }),
    ).not.toBeInTheDocument();
  });

  it("opening and closing the panel does not call commitWorkingV2Update", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(workingV2Commit, "commitWorkingV2Update");
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Open configuration panel" }));
    await user.click(screen.getByRole("button", { name: "Close configuration panel" }));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("opening and closing the panel does not mutate active preset config", async () => {
    const user = userEvent.setup();
    const before = structuredClone(getActiveAppConfig());

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Open configuration panel" }));
    await user.click(screen.getByRole("button", { name: "Close configuration panel" }));
    await user.keyboard("c");
    await user.keyboard("c");
    await user.keyboard("c");
    await user.keyboard("{Escape}");

    expect(getActiveAppConfig()).toEqual(before);
  });

  it("Layers tab: all layer checkboxes are enabled when updateConfig is provided", () => {
    const working: LibrationConfigV2 = normalizeLibrationConfig(
      appConfigToV2(getActiveAppConfig()),
    );
    const ref: { current: LibrationConfigV2 | null } = { current: working };
    render(<ConfigShell workingV2Ref={ref} updateConfig={() => {}} />);

    const layerLabels = [
      "Base map",
      "Solar shading",
      "Grid",
      "UTC clock",
      "Local clock",
      "City pins",
      "Subsolar marker",
      "Sublunar marker",
    ];
    for (const name of layerLabels) {
      expect(screen.getByRole("checkbox", { name })).not.toBeDisabled();
    }
  });

  it("Layers tab: layer checkboxes are read-only when updateConfig is omitted", () => {
    const working: LibrationConfigV2 = normalizeLibrationConfig(
      appConfigToV2(getActiveAppConfig()),
    );
    const ref: { current: LibrationConfigV2 | null } = { current: working };
    render(<ConfigShell workingV2Ref={ref} />);

    for (const name of [
      "Base map",
      "Solar shading",
      "Grid",
      "UTC clock",
      "Local clock",
      "City pins",
      "Subsolar marker",
      "Sublunar marker",
    ]) {
      expect(screen.getByRole("checkbox", { name })).toBeDisabled();
    }
    expect(ref.current).toEqual(working);
  });

  it.each(
    [
      ["Base map", "baseMap"],
      ["UTC clock", "utcClock"],
      ["Local clock", "localClock"],
      ["Subsolar marker", "subsolarMarker"],
      ["Sublunar marker", "sublunarMarker"],
    ] as const satisfies ReadonlyArray<readonly [string, keyof LayerEnableFlags]>,
  )(
    "Layers tab: toggling %s updates working v2 and derived AppConfig",
    async (label, key) => {
      const user = userEvent.setup();
      const working = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
      const ref: { current: LibrationConfigV2 | null } = { current: working };
      const derivedAppConfigRef = {
        current: deriveAppConfigFromV2(working),
      };
      const registryRef = {
        current: createLayerRegistryFromConfig(derivedAppConfigRef.current),
      };

      const updateConfig = (updater: (draft: LibrationConfigV2) => void) => {
        commitWorkingV2Update(ref, derivedAppConfigRef, registryRef, updater);
      };

      render(<ConfigShell workingV2Ref={ref} updateConfig={updateConfig} />);

      const before = ref.current!.layers[key];
      const box = screen.getByRole("checkbox", { name: label }) as HTMLInputElement;
      expect(box.checked).toBe(before);

      await user.click(box);

      expect(ref.current!.layers[key]).toBe(!before);
      expect(derivedAppConfigRef.current.layers[key]).toBe(!before);
      expect(v2ToAppConfig(ref.current!)).toEqual(derivedAppConfigRef.current);
    },
  );

  it("Pins tab: shows editable reference-city checkboxes when updateConfig is provided", async () => {
    const user = userEvent.setup();
    const working: LibrationConfigV2 = normalizeLibrationConfig(
      appConfigToV2(getActiveAppConfig()),
    );
    const ref: { current: LibrationConfigV2 | null } = { current: working };
    render(<ConfigShell workingV2Ref={ref} updateConfig={() => {}} />);

    await user.click(screen.getByRole("tab", { name: "Pins" }));

    expect(screen.getByRole("checkbox", { name: "Show pin for London" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Add custom pin" })).not.toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Pin scale" })).not.toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Pin label content mode" })).not.toBeDisabled();
  });

  it("Pins tab: toggling a reference city updates working v2 and derived AppConfig", async () => {
    const user = userEvent.setup();
    const working = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    const ref: { current: LibrationConfigV2 | null } = { current: working };
    const derivedAppConfigRef = {
      current: deriveAppConfigFromV2(working),
    };
    const registryRef = {
      current: createLayerRegistryFromConfig(derivedAppConfigRef.current),
    };

    const updateConfig = (updater: (draft: LibrationConfigV2) => void) => {
      commitWorkingV2Update(ref, derivedAppConfigRef, registryRef, updater);
    };

    render(<ConfigShell workingV2Ref={ref} updateConfig={updateConfig} />);
    await user.click(screen.getByRole("tab", { name: "Pins" }));

    const londonBox = screen.getByRole("checkbox", {
      name: "Show pin for London",
    }) as HTMLInputElement;
    const wasLondon = ref.current!.pins.reference.visibleCityIds.includes("city.london");
    expect(londonBox.checked).toBe(wasLondon);

    await user.click(londonBox);

    const nextV2 = ref.current!;
    expect(nextV2.pins.reference.visibleCityIds.includes("city.london")).toBe(!wasLondon);
    expect(derivedAppConfigRef.current.visibleCityIds).toEqual([
      ...nextV2.pins.reference.visibleCityIds,
    ]);
    expect(v2ToAppConfig(nextV2)).toEqual(derivedAppConfigRef.current);
    expect(resolveCitiesForPins(derivedAppConfigRef.current)).toEqual(
      resolveCitiesForPins(v2ToAppConfig(nextV2)),
    );
  });

  it("Geography tab: controls are disabled when updateConfig is omitted", async () => {
    const user = userEvent.setup();
    const working = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    const ref: { current: LibrationConfigV2 | null } = { current: working };
    render(<ConfigShell workingV2Ref={ref} />);

    await user.click(screen.getByRole("tab", { name: "Geography" }));

    expect(screen.getByRole("combobox", { name: "Geographic reference mode" })).toBeDisabled();
  });

  it("Geography tab: fixed coordinate edits update working v2 and derived AppConfig", async () => {
    const user = userEvent.setup();
    const working = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    const workingV2Ref: { current: LibrationConfigV2 | null } = { current: working };
    const derivedAppConfigRef = {
      current: deriveAppConfigFromV2(working),
    };
    const registryRef = {
      current: createLayerRegistryFromConfig(derivedAppConfigRef.current),
    };

    render(
      <ConfigShellWithCommitRerender
        workingV2Ref={workingV2Ref}
        derivedAppConfigRef={derivedAppConfigRef}
        registryRef={registryRef}
      />,
    );
    await user.click(screen.getByRole("tab", { name: "Geography" }));

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Geographic reference mode" }),
      "fixedCoordinate",
    );

    expect(workingV2Ref.current!.geography.referenceMode).toBe("fixedCoordinate");
    expect(derivedAppConfigRef.current.geography.referenceMode).toBe("fixedCoordinate");

    const lonInput = screen.getByRole("spinbutton", {
      name: "Fixed reference longitude in degrees",
    });
    fireEvent.change(lonInput, { target: { value: "-33.5" } });

    expect(workingV2Ref.current!.geography.fixedCoordinate.longitude).toBe(-33.5);
    expect(derivedAppConfigRef.current.geography.fixedCoordinate.longitude).toBe(-33.5);
    expect(v2ToAppConfig(workingV2Ref.current!)).toEqual(derivedAppConfigRef.current);
  });

  it("Geography tab: timezone-strip label checkbox updates working v2 and derived AppConfig", async () => {
    const user = userEvent.setup();
    const working = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    const workingV2Ref: { current: LibrationConfigV2 | null } = { current: working };
    const derivedAppConfigRef = {
      current: deriveAppConfigFromV2(working),
    };
    const registryRef = {
      current: createLayerRegistryFromConfig(derivedAppConfigRef.current),
    };

    render(
      <ConfigShellWithCommitRerender
        workingV2Ref={workingV2Ref}
        derivedAppConfigRef={derivedAppConfigRef}
        registryRef={registryRef}
      />,
    );
    await user.click(screen.getByRole("tab", { name: "Geography" }));

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Geographic reference mode" }),
      "fixedCoordinate",
    );

    const labelToggle = screen.getByRole("checkbox", {
      name: "Show fixed coordinate label on the structural NATO tab for the read-point column when this meridian anchors the top band",
    });
    expect(labelToggle).not.toBeChecked();
    await user.click(labelToggle);
    expect(workingV2Ref.current!.geography.showFixedCoordinateLabelInTimezoneStrip).toBe(true);
    expect(derivedAppConfigRef.current.geography.showFixedCoordinateLabelInTimezoneStrip).toBe(true);
    expect(v2ToAppConfig(workingV2Ref.current!)).toEqual(derivedAppConfigRef.current);
  });

  it("Chrome tab: wired controls are enabled when updateConfig is provided", async () => {
    const user = userEvent.setup();
    const working: LibrationConfigV2 = normalizeLibrationConfig(
      appConfigToV2(getActiveAppConfig()),
    );
    const ref: { current: LibrationConfigV2 | null } = { current: working };
    render(<ConfigShell workingV2Ref={ref} updateConfig={() => {}} />);

    await user.click(screen.getByRole("tab", { name: "Chrome" }));

    expect(screen.getByRole("combobox", { name: "Hour label format for top band hour markers" })).not.toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Civil time zone source for reference frame" })).not.toBeDisabled();
    expect(
      screen.queryByRole("combobox", { name: "Fixed IANA time zone for civil time in reference frame" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Read point meridian policy for top strip registration" })).not.toBeDisabled();
    expect(
      screen.getByRole("combobox", { name: "Reference city for read point meridian" }),
    ).not.toBeDisabled();
    expect(
      screen.getByRole("checkbox", { name: "Show bottom reference time and date readout" }),
    ).not.toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Chrome major area" })).not.toBeDisabled();
    await user.selectOptions(screen.getByTestId("chrome-major-area-select"), "natoTimezone");
    expect(
      screen.getByRole("checkbox", { name: "Show NATO timezone letter row on the top strip" }),
    ).not.toBeDisabled();
  });

  it("Chrome tab: wired selects are disabled when updateConfig is omitted", async () => {
    const user = userEvent.setup();
    const working: LibrationConfigV2 = normalizeLibrationConfig(
      appConfigToV2(getActiveAppConfig()),
    );
    const ref: { current: LibrationConfigV2 | null } = { current: working };
    render(<ConfigShell workingV2Ref={ref} />);

    await user.click(screen.getByRole("tab", { name: "Chrome" }));

    expect(screen.getByRole("combobox", { name: "Hour label format for top band hour markers" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Civil time zone source for reference frame" })).toBeDisabled();
    expect(
      screen.getByRole("checkbox", { name: "Show bottom reference time and date readout" }),
    ).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Chrome major area" })).not.toBeDisabled();
    await user.selectOptions(screen.getByTestId("chrome-major-area-select"), "natoTimezone");
    expect(
      screen.getByRole("checkbox", { name: "Show NATO timezone letter row on the top strip" }),
    ).toBeDisabled();
  });

  it("Chrome tab: More chrome layout toggles update working v2 and derived AppConfig", async () => {
    const user = userEvent.setup();
    const working = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    const ref: { current: LibrationConfigV2 | null } = { current: working };
    const derivedAppConfigRef = {
      current: deriveAppConfigFromV2(working),
    };
    const registryRef = {
      current: createLayerRegistryFromConfig(derivedAppConfigRef.current),
    };

    const updateConfig = (updater: (draft: LibrationConfigV2) => void) => {
      commitWorkingV2Update(ref, derivedAppConfigRef, registryRef, updater);
    };

    render(<ConfigShell workingV2Ref={ref} updateConfig={updateConfig} />);
    await user.click(screen.getByRole("tab", { name: "Chrome" }));

    const bottomCb = screen.getByRole("checkbox", { name: "Show bottom reference time and date readout" });
    await user.click(bottomCb);
    expect(ref.current!.chrome.layout.bottomInformationBarVisible).toBe(false);
    expect(derivedAppConfigRef.current.displayChromeLayout.bottomInformationBarVisible).toBe(false);

    await user.selectOptions(screen.getByTestId("chrome-major-area-select"), "natoTimezone");
    const tzCb = screen.getByRole("checkbox", { name: "Show NATO timezone letter row on the top strip" });
    await user.click(tzCb);
    expect(ref.current!.chrome.layout.timezoneLetterRowVisible).toBe(false);
    expect(derivedAppConfigRef.current.displayChromeLayout.timezoneLetterRowVisible).toBe(false);
    expect(v2ToAppConfig(ref.current!)).toEqual(derivedAppConfigRef.current);
  });

  it("Chrome tab: changing topBandMode updates working v2 and derived AppConfig", async () => {
    const user = userEvent.setup();
    const working = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    const ref: { current: LibrationConfigV2 | null } = { current: working };
    const derivedAppConfigRef = {
      current: deriveAppConfigFromV2(working),
    };
    const registryRef = {
      current: createLayerRegistryFromConfig(derivedAppConfigRef.current),
    };

    const updateConfig = (updater: (draft: LibrationConfigV2) => void) => {
      commitWorkingV2Update(ref, derivedAppConfigRef, registryRef, updater);
    };

    render(<ConfigShell workingV2Ref={ref} updateConfig={updateConfig} />);
    await user.click(screen.getByRole("tab", { name: "Chrome" }));

    const modeSelect = screen.getByRole("combobox", { name: "Hour label format for top band hour markers" });
    await user.selectOptions(modeSelect, "utc24");

    expect(ref.current!.chrome.displayTime.topBandMode).toBe("utc24");
    expect(derivedAppConfigRef.current.displayTime.topBandMode).toBe("utc24");
    expect(v2ToAppConfig(ref.current!)).toEqual(derivedAppConfigRef.current);
  });

  it("Chrome tab: switching reference timezone source updates working v2 and derived AppConfig", async () => {
    const user = userEvent.setup();
    const working = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    const ref: { current: LibrationConfigV2 | null } = { current: working };
    const derivedAppConfigRef = {
      current: deriveAppConfigFromV2(working),
    };
    const registryRef = {
      current: createLayerRegistryFromConfig(derivedAppConfigRef.current),
    };

    const updateConfig = (updater: (draft: LibrationConfigV2) => void) => {
      commitWorkingV2Update(ref, derivedAppConfigRef, registryRef, updater);
    };

    render(<ConfigShell workingV2Ref={ref} updateConfig={updateConfig} />);
    await user.click(screen.getByRole("tab", { name: "Chrome" }));

    const sourceSelect = screen.getByRole("combobox", { name: "Civil time zone source for reference frame" });
    await user.selectOptions(sourceSelect, "fixed");

    expect(ref.current!.chrome.displayTime.referenceTimeZone).toEqual({
      source: "fixed",
      timeZone: "UTC",
    });
    expect(derivedAppConfigRef.current.displayTime.referenceTimeZone).toEqual({
      source: "fixed",
      timeZone: "UTC",
    });

    await user.selectOptions(sourceSelect, "system");
    expect(ref.current!.chrome.displayTime.referenceTimeZone).toEqual({ source: "system" });
    expect(derivedAppConfigRef.current.displayTime.referenceTimeZone).toEqual({
      source: "system",
    });
  });

  it("Chrome tab: selecting a fixed IANA zone updates derived AppConfig", async () => {
    const user = userEvent.setup();
    const working = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    working.chrome.displayTime.referenceTimeZone = { source: "fixed", timeZone: "UTC" };
    const normalized = normalizeLibrationConfig(working);
    const ref: { current: LibrationConfigV2 | null } = { current: normalized };
    const derivedAppConfigRef = {
      current: deriveAppConfigFromV2(normalized),
    };
    const registryRef = {
      current: createLayerRegistryFromConfig(derivedAppConfigRef.current),
    };

    const updateConfig = (updater: (draft: LibrationConfigV2) => void) => {
      commitWorkingV2Update(ref, derivedAppConfigRef, registryRef, updater);
    };

    render(<ConfigShell workingV2Ref={ref} updateConfig={updateConfig} />);
    await user.click(screen.getByRole("tab", { name: "Chrome" }));

    const zoneSelect = screen.getByRole("combobox", { name: "Fixed IANA time zone for civil time in reference frame" });
    await user.selectOptions(zoneSelect, "America/New_York");

    expect(derivedAppConfigRef.current.displayTime.referenceTimeZone).toEqual({
      source: "fixed",
      timeZone: "America/New_York",
    });
    expect(v2ToAppConfig(ref.current!)).toEqual(derivedAppConfigRef.current);
  });

  it("Data tab: controls are disabled when updateConfig is omitted", async () => {
    const user = userEvent.setup();
    const working = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    const ref: { current: LibrationConfigV2 | null } = { current: working };
    render(<ConfigShell workingV2Ref={ref} />);

    await user.click(screen.getByRole("tab", { name: "Data" }));

    expect(screen.getByRole("combobox", { name: "Data pipeline mode" })).toBeDisabled();
    expect(
      screen.getByRole("checkbox", { name: "Show data annotations when available" }),
    ).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Enable demo time" })).toBeDisabled();
    expect(screen.getByLabelText("Demo start date")).toBeDisabled();
    expect(screen.getByLabelText("Demo start time")).toBeDisabled();
    expect(screen.getByRole("spinbutton", { name: "Playback speed" })).toBeDisabled();
  });

  it("Chrome tab: top band anchor mode selector is live and updates working v2 and AppConfig", async () => {
    const user = userEvent.setup();
    const working = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    const ref: { current: LibrationConfigV2 | null } = { current: working };
    const derivedAppConfigRef = {
      current: deriveAppConfigFromV2(working),
    };
    const registryRef = {
      current: createLayerRegistryFromConfig(derivedAppConfigRef.current),
    };

    const updateConfig = (updater: (draft: LibrationConfigV2) => void) => {
      commitWorkingV2Update(ref, derivedAppConfigRef, registryRef, updater);
    };

    render(<ConfigShell workingV2Ref={ref} updateConfig={updateConfig} />);
    await user.click(screen.getByRole("tab", { name: "Chrome" }));

    const anchorMode = screen.getByRole("combobox", { name: "Read point meridian policy for top strip registration" });
    expect(anchorMode).toBeVisible();

    await user.selectOptions(anchorMode, "auto");
    expect(ref.current!.chrome.displayTime.topBandAnchor).toEqual({ mode: "auto" });
    expect(derivedAppConfigRef.current.displayTime.topBandAnchor).toEqual({ mode: "auto" });
    expect(v2ToAppConfig(ref.current!)).toEqual(derivedAppConfigRef.current);
  });

  it("Chrome tab: fixedCity anchor and city choice update derived AppConfig", async () => {
    const user = userEvent.setup();
    const working = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    working.chrome.displayTime.topBandAnchor = { mode: "auto" };
    const normalized = normalizeLibrationConfig(working);
    const ref: { current: LibrationConfigV2 | null } = { current: normalized };
    const derivedAppConfigRef = {
      current: deriveAppConfigFromV2(normalized),
    };
    const registryRef = {
      current: createLayerRegistryFromConfig(derivedAppConfigRef.current),
    };

    render(
      <ConfigShellWithCommitRerender
        workingV2Ref={ref}
        derivedAppConfigRef={derivedAppConfigRef}
        registryRef={registryRef}
      />,
    );
    await user.click(screen.getByRole("tab", { name: "Chrome" }));

    await user.selectOptions(screen.getByRole("combobox", { name: "Read point meridian policy for top strip registration" }), "fixedCity");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Reference city for read point meridian" }),
      "city.tokyo",
    );

    expect(ref.current!.chrome.displayTime.topBandAnchor).toEqual({
      mode: "fixedCity",
      cityId: "city.tokyo",
    });
    expect(derivedAppConfigRef.current.displayTime.topBandAnchor).toEqual({
      mode: "fixedCity",
      cityId: "city.tokyo",
    });
    expect(v2ToAppConfig(ref.current!)).toEqual(derivedAppConfigRef.current);
  });

  it("Chrome tab: fixedLongitude anchor updates after valid longitude entry", async () => {
    const user = userEvent.setup();
    const working = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    working.chrome.displayTime.topBandAnchor = { mode: "auto" };
    const normalized = normalizeLibrationConfig(working);
    const ref: { current: LibrationConfigV2 | null } = { current: normalized };
    const derivedAppConfigRef = {
      current: deriveAppConfigFromV2(normalized),
    };
    const registryRef = {
      current: createLayerRegistryFromConfig(derivedAppConfigRef.current),
    };

    render(
      <ConfigShellWithCommitRerender
        workingV2Ref={ref}
        derivedAppConfigRef={derivedAppConfigRef}
        registryRef={registryRef}
      />,
    );
    await user.click(screen.getByRole("tab", { name: "Chrome" }));

    await user.selectOptions(screen.getByRole("combobox", { name: "Read point meridian policy for top strip registration" }), "fixedLongitude");

    const lonInput = screen.getByRole("textbox", {
      name: "Anchor meridian longitude in degrees east",
    });
    await user.clear(lonInput);
    await user.type(lonInput, "-33.5");
    await user.tab();

    expect(ref.current!.chrome.displayTime.topBandAnchor).toEqual({
      mode: "fixedLongitude",
      longitudeDeg: -33.5,
    });
    expect(derivedAppConfigRef.current.displayTime.topBandAnchor).toEqual({
      mode: "fixedLongitude",
      longitudeDeg: -33.5,
    });
  });

  it("Chrome tab: invalid longitude text on blur does not corrupt working v2", async () => {
    const user = userEvent.setup();
    const working = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    working.chrome.displayTime.topBandAnchor = { mode: "fixedLongitude", longitudeDeg: 12.25 };
    const normalized = normalizeLibrationConfig(working);
    const ref: { current: LibrationConfigV2 | null } = { current: normalized };
    const derivedAppConfigRef = {
      current: deriveAppConfigFromV2(normalized),
    };
    const registryRef = {
      current: createLayerRegistryFromConfig(derivedAppConfigRef.current),
    };

    render(
      <ConfigShellWithCommitRerender
        workingV2Ref={ref}
        derivedAppConfigRef={derivedAppConfigRef}
        registryRef={registryRef}
      />,
    );
    await user.click(screen.getByRole("tab", { name: "Chrome" }));

    const lonInput = screen.getByRole("textbox", {
      name: "Anchor meridian longitude in degrees east",
    });
    await user.clear(lonInput);
    await user.type(lonInput, "not-a-number");
    await user.tab();

    expect(ref.current!.chrome.displayTime.topBandAnchor).toEqual({
      mode: "fixedLongitude",
      longitudeDeg: 12.25,
    });
    expect(derivedAppConfigRef.current.displayTime.topBandAnchor).toEqual({
      mode: "fixedLongitude",
      longitudeDeg: 12.25,
    });
  });

  it("Chrome tab: out-of-range longitude is clamped into a valid config value", async () => {
    const user = userEvent.setup();
    const working = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    working.chrome.displayTime.topBandAnchor = { mode: "fixedLongitude", longitudeDeg: 0 };
    const normalized = normalizeLibrationConfig(working);
    const ref: { current: LibrationConfigV2 | null } = { current: normalized };
    const derivedAppConfigRef = {
      current: deriveAppConfigFromV2(normalized),
    };
    const registryRef = {
      current: createLayerRegistryFromConfig(derivedAppConfigRef.current),
    };

    render(
      <ConfigShellWithCommitRerender
        workingV2Ref={ref}
        derivedAppConfigRef={derivedAppConfigRef}
        registryRef={registryRef}
      />,
    );
    await user.click(screen.getByRole("tab", { name: "Chrome" }));

    const lonInput = screen.getByRole("textbox", {
      name: "Anchor meridian longitude in degrees east",
    });
    await user.clear(lonInput);
    await user.type(lonInput, "500");
    await user.tab();

    expect(ref.current!.chrome.displayTime.topBandAnchor).toEqual({
      mode: "fixedLongitude",
      longitudeDeg: 180,
    });
  });

  it("Chrome tab: anchor-only edits do not rebuild the layer registry", async () => {
    const user = userEvent.setup();
    const working = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    const ref: { current: LibrationConfigV2 | null } = { current: working };
    const derivedAppConfigRef = {
      current: deriveAppConfigFromV2(working),
    };
    const registryRef = {
      current: createLayerRegistryFromConfig(derivedAppConfigRef.current),
    };
    const registryBefore = registryRef.current;

    const spy = vi.spyOn(appBootstrap, "createLayerRegistryFromConfig");

    render(
      <ConfigShellWithCommitRerender
        workingV2Ref={ref}
        derivedAppConfigRef={derivedAppConfigRef}
        registryRef={registryRef}
      />,
    );
    await user.click(screen.getByRole("tab", { name: "Chrome" }));

    await user.selectOptions(screen.getByRole("combobox", { name: "Read point meridian policy for top strip registration" }), "auto");
    await user.selectOptions(screen.getByRole("combobox", { name: "Read point meridian policy for top strip registration" }), "fixedCity");

    expect(registryRef.current).toBe(registryBefore);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("Pins tab: changing pin scale calls updateConfig", async () => {
    const user = userEvent.setup();
    const working: LibrationConfigV2 = normalizeLibrationConfig(
      appConfigToV2(getActiveAppConfig()),
    );
    const ref: { current: LibrationConfigV2 | null } = { current: working };
    const spy = vi.fn();
    render(<ConfigShell workingV2Ref={ref} updateConfig={spy} />);

    await user.click(screen.getByRole("tab", { name: "Pins" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Pin scale" }), "large");

    expect(spy).toHaveBeenCalled();
    const draft = structuredClone(working);
    (spy.mock.calls[0]![0] as (d: LibrationConfigV2) => void)(draft);
    expect(draft.pins.presentation.scale).toBe("large");
  });

  it("Pins tab: add custom pin updates working v2 and derived AppConfig", async () => {
    const user = userEvent.setup();
    const working = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    const ref: { current: LibrationConfigV2 | null } = { current: working };
    const derivedAppConfigRef = {
      current: deriveAppConfigFromV2(working),
    };
    const registryRef = {
      current: createLayerRegistryFromConfig(derivedAppConfigRef.current),
    };

    render(
      <ConfigShellWithCommitRerender
        workingV2Ref={ref}
        derivedAppConfigRef={derivedAppConfigRef}
        registryRef={registryRef}
      />,
    );
    await user.click(screen.getByRole("tab", { name: "Pins" }));
    await user.click(screen.getByRole("button", { name: "Add custom pin" }));

    expect(ref.current!.pins.custom.length).toBe(1);
    const id = ref.current!.pins.custom[0]!.id;
    expect(id.startsWith("custom.")).toBe(true);
    expect(derivedAppConfigRef.current.customPins).toEqual(ref.current!.pins.custom);
    expect(v2ToAppConfig(ref.current!)).toEqual(derivedAppConfigRef.current);

    const labelBox = screen.getByRole("textbox", { name: `Custom pin ${id} label` });
    await user.type(labelBox, "HQ");
    expect(ref.current!.pins.custom[0]!.label).toBe("HQ");
    expect(derivedAppConfigRef.current.customPins[0]!.label).toBe("HQ");
  });

  it("Layers tab: toggling Grid through App updates the checkbox", async () => {
    const user = userEvent.setup();
    const beforeGrid = normalizeLibrationConfig(
      appConfigToV2(getActiveAppConfig()),
    ).layers.grid;
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Open configuration panel" }));
    const grid = screen.getByRole("checkbox", { name: "Grid" }) as HTMLInputElement;
    expect(grid.checked).toBe(beforeGrid);
    await user.click(grid);
    expect(grid.checked).toBe(!beforeGrid);
  });

  it("config components do not import the renderer package", () => {
    for (const [path, source] of Object.entries(configSources)) {
      assertNoRendererImportInConfig(source, path);
    }
  });
});
