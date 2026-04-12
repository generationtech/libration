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
import {
  defaultLibrationConfigV2,
  normalizeLibrationConfig,
  type LibrationConfigV2,
} from "../../config/v2/librationConfig";
import { HourMarkersEditor } from "./HourMarkersEditor";

function HourMarkersHarness({
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
      <HourMarkersEditor config={config} updateConfig={updateConfig} />
      {children?.({ config })}
    </>
  );
}

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

describe("HourMarkersEditor structured authoring", () => {
  afterEach(() => {
    cleanup();
  });

  it("realization kind change resets appearance for the new kind", () => {
    let last: LibrationConfigV2 | null = null;
    render(
      <HourMarkersHarness
        initial={baseCustomHourMarkers({
          realization: { kind: "text", fontAssetId: "zeroes-one", appearance: { color: "#112233" } },
        })}
      >
        {({ config }) => {
          last = config;
          return null;
        }}
      </HourMarkersHarness>,
    );

    fireEvent.change(screen.getByRole("combobox", { name: /Top-band hour marker realization kind/i }), {
      target: { value: "radialLine" },
    });

    expect(last!.chrome.layout.hourMarkers.realization).toEqual({ kind: "radialLine", appearance: {} });
  });

  it("text path: font change updates structured realization", () => {
    let last: LibrationConfigV2 | null = null;
    render(
      <HourMarkersHarness
        initial={baseCustomHourMarkers({
          realization: { kind: "text", fontAssetId: "dseg7modern-regular", appearance: {} },
        })}
      >
        {({ config }) => {
          last = config;
          return null;
        }}
      </HourMarkersHarness>,
    );

    fireEvent.change(screen.getByRole("combobox", { name: /Font for top-band hour disk numerals/i }), {
      target: { value: "computer" },
    });

    expect(last!.chrome.layout.hourMarkers.realization).toMatchObject({
      kind: "text",
      fontAssetId: "computer",
    });
  });

  it("realization kind select updates glyph mode", () => {
    let last: LibrationConfigV2 | null = null;
    render(
      <HourMarkersHarness
        initial={baseCustomHourMarkers({
          realization: { kind: "analogClock", appearance: {} },
        })}
      >
        {({ config }) => {
          last = config;
          return null;
        }}
      </HourMarkersHarness>,
    );

    fireEvent.change(screen.getByRole("combobox", { name: /Top-band hour marker realization kind/i }), {
      target: { value: "radialWedge" },
    });

    expect(last!.chrome.layout.hourMarkers.realization).toEqual({ kind: "radialWedge", appearance: {} });
  });

  it("color and size write structured fields only", () => {
    let last: LibrationConfigV2 | null = null;
    render(
      <HourMarkersHarness initial={baseCustomHourMarkers()}>
        {({ config }) => {
          last = config;
          return null;
        }}
      </HourMarkersHarness>,
    );

    fireEvent.change(screen.getByLabelText(/Top-band hour marker color/i), {
      target: { value: "#aabbcc" },
    });
    expect(last!.chrome.layout.hourMarkers.realization).toMatchObject({
      appearance: { color: "#aabbcc" },
    });

    fireEvent.change(screen.getByRole("slider", { name: /Hour marker size multiplier/i }), {
      target: { value: "1.5" },
    });
    expect(last!.chrome.layout.hourMarkers.layout.sizeMultiplier).toBe(1.5);
  });

  it("visibility toggle persists visible and disables subordinate controls when off", () => {
    let last: LibrationConfigV2 | null = null;
    render(
      <HourMarkersHarness initial={baseCustomHourMarkers()}>
        {({ config }) => {
          last = config;
          return null;
        }}
      </HourMarkersHarness>,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: /Show 24-hour indicator entries/i }));
    expect(last!.chrome.layout.hourMarkers.visible).toBe(false);
    expect(screen.getByRole("combobox", { name: /Top-band hour marker realization kind/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox", { name: /Show 24-hour indicator entries/i }));
    expect(last!.chrome.layout.hourMarkers.visible).toBe(true);
    expect(screen.getByRole("combobox", { name: /Top-band hour marker realization kind/i })).not.toBeDisabled();
  });

  it("behavior select updates config.behavior", () => {
    let last: LibrationConfigV2 | null = null;
    render(
      <HourMarkersHarness initial={baseCustomHourMarkers()}>
        {({ config }) => {
          last = config;
          return null;
        }}
      </HourMarkersHarness>,
    );

    fireEvent.change(screen.getByRole("combobox", { name: /Top-band hour marker placement behavior/i }), {
      target: { value: "staticZoneAnchored" },
    });

    expect(last!.chrome.layout.hourMarkers.behavior).toBe("staticZoneAnchored");
  });
});
