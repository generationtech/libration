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
import { CHROME_TOPIC_IDS, type ChromeTopicId } from "./chromeTopicTypes";

function selectChromeTopic(topic: ChromeTopicId): void {
  fireEvent.change(screen.getByTestId("chrome-topic-select"), { target: { value: topic } });
}

function setHourLabelFormat(mode: string): void {
  selectChromeTopic("referenceAndClock");
  fireEvent.change(screen.getByLabelText(/Hour label format for top band hour markers/i), {
    target: { value: mode },
  });
}

function ChromeTabTestHarness({
  initial,
  children,
  updateCallCount,
}: {
  initial: LibrationConfigV2;
  children?: (ctx: { config: LibrationConfigV2 }) => ReactNode;
  updateCallCount?: { current: number };
}) {
  const [config, setConfig] = useState<LibrationConfigV2>(() => normalizeLibrationConfig(initial));
  const updateConfig = useCallback(
    (updater: (draft: LibrationConfigV2) => void) => {
      if (updateCallCount) {
        updateCallCount.current += 1;
      }
      setConfig((prev) => {
        const draft = normalizeLibrationConfig(prev);
        updater(draft);
        return normalizeLibrationConfig(draft);
      });
    },
    [updateCallCount],
  );
  return (
    <>
      <ChromeTab config={config} updateConfig={updateConfig} />
      {children?.({ config })}
    </>
  );
}

describe("ChromeTab topics", () => {
  afterEach(() => {
    cleanup();
  });

  it("does not host the global default product text font control (moved to General tab)", () => {
    const initial = defaultLibrationConfigV2();
    render(<ChromeTabTestHarness initial={initial} />);
    expect(screen.queryByTestId("chrome-global-text-font-select")).toBeNull();
  });

  it("defaults to Reference & clock with the unified topic order and sticky selector", () => {
    const initial = defaultLibrationConfigV2();
    render(<ChromeTabTestHarness initial={initial} />);
    const select = screen.getByTestId("chrome-topic-select") as HTMLSelectElement;
    expect(select).toHaveValue("referenceAndClock");
    expect([...select.options].map((option) => option.value)).toEqual([...CHROME_TOPIC_IDS]);
    expect([...select.options].map((option) => option.textContent)).toEqual([
      "Reference & clock",
      "Bottom HUD",
      "Hour indicators",
      "Tick tape",
      "NATO time zones",
    ]);
    expect(screen.getByRole("combobox", { name: "Chrome topic" })).toBe(select);
    expect(screen.queryByTestId("chrome-major-area-select")).toBeNull();
    expect(screen.queryByRole("combobox", { name: /Chrome major area/i })).toBeNull();
    const nav = screen.getByTestId("chrome-topic-nav");
    expect(nav.classList.contains("config-topic-nav")).toBe(true);
    expect(nav.querySelector("#config-chrome-topic")).toBe(select);
    expect(screen.getByRole("heading", { name: "Instrument chrome" }).closest(".config-topic-nav")).toBeNull();
    expect(screen.getByTestId("chrome-editor-reference-and-clock")).toBeInTheDocument();
    expect(screen.queryByTestId("chrome-editor-bottom-hud")).toBeNull();
    expect(screen.queryByTestId("chrome-editor-hour-indicators")).toBeNull();
    expect(screen.queryByTestId("chrome-editor-tick-tape")).toBeNull();
    expect(screen.queryByTestId("chrome-editor-nato-timezone")).toBeNull();
  });

  it("mounts only the selected topic editor", () => {
    const initial = defaultLibrationConfigV2();
    render(<ChromeTabTestHarness initial={initial} />);

    selectChromeTopic("bottomHud");
    expect(screen.getByTestId("chrome-editor-bottom-hud")).toBeInTheDocument();
    expect(screen.queryByTestId("chrome-editor-reference-and-clock")).toBeNull();
    expect(screen.queryByTestId("chrome-editor-hour-indicators")).toBeNull();

    selectChromeTopic("hourIndicators");
    expect(screen.getByTestId("chrome-editor-hour-indicators")).toBeInTheDocument();
    expect(screen.queryByTestId("chrome-editor-bottom-hud")).toBeNull();
    expect(screen.queryByTestId("chrome-editor-tick-tape")).toBeNull();

    selectChromeTopic("tickTape");
    expect(screen.getByTestId("chrome-editor-tick-tape")).toBeInTheDocument();
    expect(screen.queryByTestId("chrome-editor-hour-indicators")).toBeNull();
    expect(screen.queryByRole("combobox", { name: /Top-band hour marker realization kind/i })).toBeNull();

    selectChromeTopic("natoTimezone");
    expect(screen.getByTestId("chrome-editor-nato-timezone")).toBeInTheDocument();
    expect(screen.queryByTestId("chrome-editor-tick-tape")).toBeNull();
    expect(
      screen.getByRole("checkbox", { name: /Show NATO timezone letter row on the top strip/i }),
    ).toBeInTheDocument();
  });

  it("exposes reference-city date/time/seconds toggles for the lower-left HUD (no Local/Refer/UTC rows)", () => {
    const initial = defaultLibrationConfigV2();
    render(<ChromeTabTestHarness initial={initial} />);
    selectChromeTopic("bottomHud");
    expect(screen.getByTestId("chrome-bottom-hud-show-date")).toBeInTheDocument();
    expect(screen.getByTestId("chrome-bottom-hud-show-time")).toBeInTheDocument();
    expect(screen.getByTestId("chrome-bottom-hud-show-seconds")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /Show Local time row/i })).toBeNull();
    expect(screen.queryByRole("checkbox", { name: /Show UTC time row/i })).toBeNull();
  });

  it("bottom readout font stores override and clears on Default (typography role)", () => {
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
    selectChromeTopic("bottomHud");
    const sel = screen.getByTestId("chrome-bottom-readout-font-select");
    fireEvent.change(sel, { target: { value: "flip-clock" } });
    expect(last!.chrome.layout.bottomReadoutFontAssetId).toBe("flip-clock");
    fireEvent.change(sel, { target: { value: "" } });
    expect(last!.chrome.layout.bottomReadoutFontAssetId).toBeUndefined();
  });

  it("persists NATO zone letter font on chrome.layout and clears when default is chosen", () => {
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
    selectChromeTopic("natoTimezone");
    fireEvent.change(screen.getByTestId("nato-timezone-letter-font-select"), { target: { value: "computer" } });
    expect(last!.chrome.layout.timezoneLetterRowFontAssetId).toBe("computer");
    fireEvent.change(screen.getByTestId("nato-timezone-letter-font-select"), { target: { value: "" } });
    expect(last!.chrome.layout.timezoneLetterRowFontAssetId).toBeUndefined();
  });

  it("does not call updateConfig or persist topic selection when switching topics", () => {
    let last: LibrationConfigV2 | null = null;
    const updateCallCount = { current: 0 };
    const initial = defaultLibrationConfigV2();
    render(
      <ChromeTabTestHarness initial={initial} updateCallCount={updateCallCount}>
        {({ config }) => {
          last = config;
          return null;
        }}
      </ChromeTabTestHarness>,
    );
    const before = JSON.stringify(last);
    selectChromeTopic("tickTape");
    expect(JSON.stringify(last)).toBe(before);
    expect(updateCallCount.current).toBe(0);
    selectChromeTopic("bottomHud");
    expect(updateCallCount.current).toBe(0);
    fireEvent.click(screen.getByTestId("chrome-bottom-hud-show-date"));
    expect(updateCallCount.current).toBe(1);
    expect(last!.chrome.layout.bottomTimeStackShowDate).toBe(false);
  });

  it("keeps committed longitude when switching away from Reference & clock", () => {
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
    fireEvent.change(screen.getByLabelText(/Read point meridian policy for top strip registration/i), {
      target: { value: "fixedLongitude" },
    });
    const input = screen.getByLabelText(/Anchor meridian longitude in degrees east/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "42" } });
    fireEvent.blur(input);
    expect(last!.chrome.displayTime.topBandAnchor).toEqual({ mode: "fixedLongitude", longitudeDeg: 42 });

    selectChromeTopic("bottomHud");
    selectChromeTopic("referenceAndClock");
    expect(last!.chrome.displayTime.topBandAnchor).toEqual({ mode: "fixedLongitude", longitudeDeg: 42 });
    expect(screen.getByLabelText(/Anchor meridian longitude in degrees east/i)).toHaveValue("42");
  });

  it("resets the tab-panel scroll on topic change but not on setting edits", () => {
    render(
      <div className="config-tab-panel" data-testid="chrome-scroll-host">
        <ChromeTabTestHarness initial={defaultLibrationConfigV2()} />
      </div>,
    );
    const host = screen.getByTestId("chrome-scroll-host");
    let scrollTopValue = 0;
    Object.defineProperty(host, "scrollTop", {
      configurable: true,
      get: () => scrollTopValue,
      set: (next: number) => {
        scrollTopValue = next;
      },
    });

    selectChromeTopic("hourIndicators");
    expect(scrollTopValue).toBe(0);
    expect(screen.getByTestId("chrome-editor-hour-indicators")).toBeInTheDocument();

    scrollTopValue = 420;
    const size = screen.getByRole("slider", { name: /Hour marker size multiplier/i }) as HTMLInputElement;
    fireEvent.change(size, { target: { value: "1.2" } });
    expect(size.value).toBe("1.2");
    expect(scrollTopValue).toBe(420);

    selectChromeTopic("bottomHud");
    expect(scrollTopValue).toBe(0);
    expect(screen.getByTestId("chrome-editor-bottom-hud")).toBeInTheDocument();
    expect(screen.queryByTestId("chrome-editor-hour-indicators")).toBeNull();
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
    selectChromeTopic("tickTape");
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
    selectChromeTopic("hourIndicators");
    expect(screen.queryByRole("combobox", { name: /hour marker text style/i })).toBeNull();
    expect(screen.queryByLabelText(/hour marker text style/i)).toBeNull();
  });

  it("text branch shows font, color, and size", () => {
    const initial = baseCustomHourMarkers({
      realization: { kind: "text", fontAssetId: "zeroes-one", appearance: {} },
    });
    render(<ChromeTabTestHarness initial={initial} />);
    selectChromeTopic("hourIndicators");

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
    selectChromeTopic("hourIndicators");

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
    selectChromeTopic("hourIndicators");

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
    selectChromeTopic("hourIndicators");

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
    selectChromeTopic("hourIndicators");

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

  it("in UTC label mode with legacy procedural on disk, normalization rewrites to text and the selector shows Text", () => {
    const d = defaultLibrationConfigV2();
    let last: LibrationConfigV2 | null = null;
    const initial = normalizeLibrationConfig({
      ...d,
      chrome: {
        ...d.chrome,
        displayTime: { ...d.chrome.displayTime, topBandMode: "utc24" },
        layout: {
          ...d.chrome.layout,
          hourMarkers: {
            ...d.chrome.layout.hourMarkers,
            realization: { kind: "analogClock", appearance: {} },
            layout: { sizeMultiplier: 1 },
          },
        },
      },
    });
    render(
      <ChromeTabTestHarness initial={initial}>
        {({ config }) => {
          last = config;
          return null;
        }}
      </ChromeTabTestHarness>,
    );
    selectChromeTopic("hourIndicators");
    const sel = screen.getByTestId("chrome-hour-marker-realization-kind-select");
    expect(sel.querySelectorAll("option")).toHaveLength(1);
    expect(sel).toHaveValue("text");
    expect(sel).not.toBeDisabled();
    expect(last!.chrome.layout.hourMarkers.realization.kind).toBe("text");
    expect(screen.getByTestId("chrome-hour-marker-utc-text-only-hint")).toBeInTheDocument();
    expect(screen.queryByTestId("chrome-hour-marker-utc-procedural-preserved-hint")).toBeNull();
  });

  it("in non-UTC label mode, realization kind lists all four kinds", () => {
    const d = defaultLibrationConfigV2();
    const initial = normalizeLibrationConfig({
      ...d,
      chrome: {
        ...d.chrome,
        displayTime: { ...d.chrome.displayTime, topBandMode: "local24" },
      },
    });
    render(<ChromeTabTestHarness initial={initial} />);
    selectChromeTopic("hourIndicators");
    expect(screen.getByTestId("chrome-hour-marker-realization-kind-select").querySelectorAll("option")).toHaveLength(
      4,
    );
    expect(screen.queryByTestId("chrome-hour-marker-utc-text-only-hint")).toBeNull();
  });

  it("UTC then civil label mode does not strip text hour-marker appearance when realization select re-selects Text", () => {
    let last: LibrationConfigV2 | null = null;
    const d = defaultLibrationConfigV2();
    const initial = normalizeLibrationConfig({
      ...d,
      chrome: {
        ...d.chrome,
        displayTime: { ...d.chrome.displayTime, topBandMode: "utc24" },
        layout: {
          ...d.chrome.layout,
          hourMarkers: {
            ...d.chrome.layout.hourMarkers,
            realization: { kind: "text", fontAssetId: "zeroes-one", appearance: { color: "#c0ffee" } },
            layout: { sizeMultiplier: 1 },
          },
        },
      },
    });
    render(
      <ChromeTabTestHarness initial={initial}>
        {({ config }) => {
          last = config;
          return null;
        }}
      </ChromeTabTestHarness>,
    );
    selectChromeTopic("hourIndicators");
    fireEvent.change(screen.getByTestId("chrome-hour-marker-realization-kind-select"), {
      target: { value: "text" },
    });
    expect(last!.chrome.layout.hourMarkers.realization).toEqual({
      kind: "text",
      fontAssetId: "zeroes-one",
      appearance: { color: "#c0ffee" },
    });
    setHourLabelFormat("local12");
    expect(last!.chrome.layout.hourMarkers.realization).toEqual({
      kind: "text",
      fontAssetId: "zeroes-one",
      appearance: { color: "#c0ffee" },
    });
  });

  it("leaving UTC label mode restores full realization options; authored kind stays text until the user changes it", () => {
    let last: LibrationConfigV2 | null = null;
    const d = defaultLibrationConfigV2();
    const initial = normalizeLibrationConfig({
      ...d,
      chrome: {
        ...d.chrome,
        displayTime: { ...d.chrome.displayTime, topBandMode: "utc24" },
        layout: {
          ...d.chrome.layout,
          hourMarkers: {
            ...d.chrome.layout.hourMarkers,
            realization: { kind: "radialWedge", appearance: {} },
            layout: { sizeMultiplier: 1 },
          },
        },
      },
    });
    render(
      <ChromeTabTestHarness initial={initial}>
        {({ config }) => {
          last = config;
          return null;
        }}
      </ChromeTabTestHarness>,
    );
    selectChromeTopic("hourIndicators");
    expect(screen.getByTestId("chrome-hour-marker-realization-kind-select").querySelectorAll("option")).toHaveLength(1);
    setHourLabelFormat("local24");
    expect(last!.chrome.displayTime.topBandMode).toBe("local24");
    expect(last!.chrome.layout.hourMarkers.realization.kind).toBe("text");
    selectChromeTopic("hourIndicators");
    expect(screen.getByTestId("chrome-hour-marker-realization-kind-select").querySelectorAll("option")).toHaveLength(4);
    expect(screen.getByTestId("chrome-hour-marker-realization-kind-select")).toHaveValue("text");
  });

  it("hour label format: entering UTC from radialLine rewrites authored realization to text; leaving UTC keeps text", () => {
    let last: LibrationConfigV2 | null = null;
    const d = defaultLibrationConfigV2();
    const initial = normalizeLibrationConfig({
      ...d,
      chrome: {
        ...d.chrome,
        displayTime: { ...d.chrome.displayTime, topBandMode: "local12" },
        layout: {
          ...d.chrome.layout,
          hourMarkers: {
            ...d.chrome.layout.hourMarkers,
            realization: {
              kind: "radialLine",
              appearance: { lineColor: "#334455", faceColor: "#667788" },
            },
            layout: { sizeMultiplier: 1 },
          },
        },
      },
    });
    render(
      <ChromeTabTestHarness initial={initial}>
        {({ config }) => {
          last = config;
          return null;
        }}
      </ChromeTabTestHarness>,
    );
    selectChromeTopic("hourIndicators");
    expect(screen.getByRole("combobox", { name: /Top-band hour marker realization kind/i })).toHaveValue(
      "radialLine",
    );
    setHourLabelFormat("utc24");
    expect(last!.chrome.displayTime.topBandMode).toBe("utc24");
    expect(last!.chrome.layout.hourMarkers.realization).toEqual({ kind: "text", appearance: {} });
    selectChromeTopic("hourIndicators");
    expect(screen.getByTestId("chrome-hour-marker-realization-kind-select")).not.toBeDisabled();
    expect(screen.getByTestId("chrome-hour-marker-realization-kind-select")).toHaveValue("text");

    setHourLabelFormat("local24");
    selectChromeTopic("hourIndicators");
    expect(screen.getByRole("combobox", { name: /Top-band hour marker realization kind/i })).toHaveValue("text");
    expect(screen.getByRole("combobox", { name: /Font for top-band hour disk numerals/i })).toBeInTheDocument();

    setHourLabelFormat("utc24");
    expect(last!.chrome.layout.hourMarkers.realization.kind).toBe("text");

    setHourLabelFormat("local12");
    selectChromeTopic("hourIndicators");
    expect(last!.chrome.layout.hourMarkers.realization).toEqual({ kind: "text", appearance: {} });
    expect(screen.getByRole("combobox", { name: /Top-band hour marker realization kind/i })).toHaveValue("text");
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
    selectChromeTopic("hourIndicators");

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
