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
import { useCallback, useState, type ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DEFAULT_APP_CONFIG } from "../../config/appConfig";
import {
  appConfigToV2,
  defaultLibrationConfigV2,
  normalizeLibrationConfig,
  type LibrationConfigV2,
} from "../../config/v2/librationConfig";
import { ChromeTab } from "./ChromeTab";

function ChromeTabTestHarness({
  initial,
  children,
}: {
  initial: LibrationConfigV2;
  children?: (ctx: { config: LibrationConfigV2 }) => ReactNode;
}) {
  const [config, setConfig] = useState(() => normalizeLibrationConfig(initial));
  const updateConfig = useCallback((updater: (draft: LibrationConfigV2) => void) => {
    setConfig((prev) => {
      const draft = normalizeLibrationConfig(prev);
      updater(draft);
      return normalizeLibrationConfig(draft);
    });
  }, []);
  return (
    <>
      <ChromeTab config={config} updateConfig={updateConfig} />
      {children?.({ config })}
    </>
  );
}

describe("ChromeTab major areas", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a Chrome major-area selector", () => {
    const initial = defaultLibrationConfigV2();
    render(<ChromeTabTestHarness initial={initial} />);
    expect(screen.getByTestId("chrome-major-area-select")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Chrome major area/i })).toHaveValue("hourIndicators");
  });

  it("defaults to the hour-indicator editor so hour-marker controls are visible", () => {
    const initial = defaultLibrationConfigV2();
    render(<ChromeTabTestHarness initial={initial} />);
    expect(screen.getByTestId("chrome-editor-hour-indicators")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Top-band hour marker realization kind/i })).toBeInTheDocument();
  });

  it("selecting tick tape shows the tick tape editor and hides hour-marker controls", () => {
    const initial = defaultLibrationConfigV2();
    render(<ChromeTabTestHarness initial={initial} />);
    fireEvent.change(screen.getByTestId("chrome-major-area-select"), { target: { value: "tickTape" } });
    expect(screen.getByTestId("chrome-editor-tick-tape")).toBeInTheDocument();
    expect(screen.queryByTestId("chrome-editor-hour-indicators")).toBeNull();
    expect(screen.queryByRole("combobox", { name: /Top-band hour marker realization kind/i })).toBeNull();
    expect(screen.queryByRole("combobox", { name: /Top instrument strip color palette/i })).toBeNull();
  });

  it("selecting NATO timezone area shows the NATO editor", () => {
    const initial = defaultLibrationConfigV2();
    render(<ChromeTabTestHarness initial={initial} />);
    fireEvent.change(screen.getByTestId("chrome-major-area-select"), { target: { value: "natoTimezone" } });
    expect(screen.getByTestId("chrome-editor-nato-timezone")).toBeInTheDocument();
    expect(screen.queryByTestId("chrome-editor-hour-indicators")).toBeNull();
    expect(screen.getByRole("checkbox", { name: /Show NATO timezone letter row on the top strip/i })).toBeInTheDocument();
  });

  it("does not persist major-area selection in config when switching areas", () => {
    let last: LibrationConfigV2 | null = null;
    const initial = defaultLibrationConfigV2();
    render(
      <ChromeTabTestHarness initial={initial}>
        {({ config }) => {
          last = config;
          return null;
        }}
      </ChromeTabTestHarness>,
    );
    const before = JSON.stringify(last);
    fireEvent.change(screen.getByTestId("chrome-major-area-select"), { target: { value: "tickTape" } });
    expect(JSON.stringify(last)).toBe(before);
  });
});

describe("ChromeTab tick tape area", () => {
  afterEach(() => {
    cleanup();
  });

  it("persists tick tape background on structured chrome.layout and resets to default", () => {
    let last: LibrationConfigV2 | null = null;
    const initial = defaultLibrationConfigV2();
    render(
      <ChromeTabTestHarness initial={initial}>
        {({ config }) => {
          last = config;
          return null;
        }}
      </ChromeTabTestHarness>,
    );
    fireEvent.change(screen.getByTestId("chrome-major-area-select"), { target: { value: "tickTape" } });
    fireEvent.change(screen.getByLabelText(/24-hour tickmarks tape area background color/i), {
      target: { value: "#aabbcc" },
    });
    expect(last!.chrome.layout.tickTapeAreaBackgroundColor).toBe("#aabbcc");

    fireEvent.click(screen.getByRole("button", { name: /Reset tickmarks tape area background to default/i }));
    expect(last!.chrome.layout.tickTapeAreaBackgroundColor).toBeUndefined();
  });
});

describe("ChromeTab top-band hour markers", () => {
  afterEach(() => {
    cleanup();
  });

  function baseCustomHourMarkers(
    overrides: Partial<LibrationConfigV2["chrome"]["layout"]["hourMarkers"]> = {},
  ): LibrationConfigV2 {
    const d = defaultLibrationConfigV2();
    const hm = d.chrome.layout.hourMarkers;
    return normalizeLibrationConfig({
      ...d,
      chrome: {
        ...d.chrome,
        layout: {
          ...d.chrome.layout,
          hourMarkers: {
            ...hm,
            realization: { kind: "text", fontAssetId: "zeroes-one", appearance: {} },
            layout: { sizeMultiplier: 1 },
            ...overrides,
          },
        },
      },
    });
  }

  it("does not expose a separate hour marker text-style preset control (font is chosen directly)", () => {
    render(<ChromeTabTestHarness initial={baseCustomHourMarkers()} />);
    expect(screen.queryByRole("combobox", { name: /hour marker text style/i })).toBeNull();
    expect(screen.queryByLabelText(/hour marker text style/i)).toBeNull();
  });

  it("text branch shows font, color, and size", () => {
    const initial = baseCustomHourMarkers({
      realization: { kind: "text", fontAssetId: "zeroes-one", appearance: {} },
    });
    render(<ChromeTabTestHarness initial={initial} />);

    expect(screen.getByRole("combobox", { name: /Top-band hour marker realization kind/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Font for top-band hour disk numerals/i })).toBeEnabled();
    expect(screen.getByLabelText(/Top-band hour marker color/i)).toBeEnabled();
    expect(screen.getByRole("slider", { name: /Hour marker size multiplier/i })).toBeEnabled();
  });

  it("analog branch shows realization kind, analog colors, and size (no font selector)", () => {
    render(
      <ChromeTabTestHarness
        initial={baseCustomHourMarkers({
          realization: { kind: "analogClock", appearance: {} },
        })}
      />,
    );

    expect(screen.getByRole("combobox", { name: /Top-band hour marker realization kind/i })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /Font for top-band hour disk numerals/i })).toBeNull();
    expect(screen.getByLabelText(/Top-band analog hour marker hand color/i)).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: /Hour marker size multiplier/i })).toBeEnabled();
  });

  it("switching hour marker realization to analog clock updates structured realization", () => {
    let last: LibrationConfigV2 | null = null;
    render(
      <ChromeTabTestHarness initial={baseCustomHourMarkers()}>
        {({ config }) => {
          last = config;
          return null;
        }}
      </ChromeTabTestHarness>,
    );

    fireEvent.change(screen.getByRole("combobox", { name: /Top-band hour marker realization kind/i }), {
      target: { value: "analogClock" },
    });

    expect(last!.chrome.layout.hourMarkers.realization).toEqual({ kind: "analogClock", appearance: {} });
  });

  it("font change updates structured hourMarkers realization", () => {
    let last: LibrationConfigV2 | null = null;
    render(
      <ChromeTabTestHarness
        initial={baseCustomHourMarkers({
          realization: { kind: "text", fontAssetId: "dseg7modern-regular", appearance: {} },
        })}
      >
        {({ config }) => {
          last = config;
          return null;
        }}
      </ChromeTabTestHarness>,
    );

    fireEvent.change(screen.getByRole("combobox", { name: /Font for top-band hour disk numerals/i }), {
      target: { value: "computer" },
    });

    expect(last!.chrome.layout.hourMarkers.realization).toMatchObject({
      kind: "text",
      fontAssetId: "computer",
    });
  });

  it("commits top-band hour marker color and clear resets to default", () => {
    let last: LibrationConfigV2 | null = null;
    render(
      <ChromeTabTestHarness initial={baseCustomHourMarkers()}>
        {({ config }) => {
          last = config;
          return null;
        }}
      </ChromeTabTestHarness>,
    );

    const colorInput = screen.getByLabelText(/Top-band hour marker color/i);
    fireEvent.change(colorInput, { target: { value: "#abcdef" } });
    expect(last!.chrome.layout.hourMarkers.realization).toMatchObject({
      appearance: { color: "#abcdef" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Clear hour marker color override/i }));
    expect(
      (last!.chrome.layout.hourMarkers.realization as { appearance?: { color?: string } }).appearance?.color,
    ).toBeUndefined();
  });

  it("structured hour markers: controls stay wired; font change updates realization", () => {
    let last: LibrationConfigV2 | null = null;
    const initial = appConfigToV2(DEFAULT_APP_CONFIG);
    const lay = initial.chrome.layout;
    const rich = normalizeLibrationConfig({
      ...initial,
      chrome: {
        ...initial.chrome,
        layout: {
          ...lay,
          hourMarkers: {
            realization: { kind: "text", fontAssetId: "dotmatrix-regular", appearance: {} },
            layout: { sizeMultiplier: 1 },
          },
        },
      },
    });

    render(
      <ChromeTabTestHarness initial={rich}>
        {({ config }) => {
          last = config;
          return null;
        }}
      </ChromeTabTestHarness>,
    );

    expect(screen.getByRole("combobox", { name: /Top-band hour marker realization kind/i })).toBeEnabled();
    expect(screen.getByRole("combobox", { name: /Font for top-band hour disk numerals/i })).toBeEnabled();
    expect(screen.getByRole("slider", { name: /Hour marker size multiplier/i })).toBeEnabled();

    fireEvent.change(screen.getByRole("combobox", { name: /Font for top-band hour disk numerals/i }), {
      target: { value: "computer" },
    });
    expect(last!.chrome.layout.hourMarkers.realization).toMatchObject({
      kind: "text",
      fontAssetId: "computer",
    });
  });
});
