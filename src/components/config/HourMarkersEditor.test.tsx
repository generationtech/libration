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
          customRepresentationEnabled: true,
          realization: { kind: "text", fontAssetId: "zeroes-one" },
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

  it("toggles customRepresentationEnabled on structured hourMarkers", () => {
    let last: LibrationConfigV2 | null = null;
    render(
      <HourMarkersHarness initial={baseCustomHourMarkers()}>
        {({ config }) => {
          last = config;
          return null;
        }}
      </HourMarkersHarness>,
    );

    fireEvent.click(
      screen.getByRole("checkbox", { name: /Use custom font or glyph style for top-band 24 hour markers/i }),
    );

    expect(last!.chrome.layout.hourMarkers.customRepresentationEnabled).toBe(false);
    expect(last!.chrome.layout.hourMarkers.realization).toEqual({
      kind: "text",
      fontAssetId: "zeroes-one",
    });
  });

  it("text path: font change updates structured realization", () => {
    let last: LibrationConfigV2 | null = null;
    render(
      <HourMarkersHarness
        initial={baseCustomHourMarkers({
          realization: { kind: "text", fontAssetId: "dseg7modern-regular" },
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

  it("glyph path: structured realization kind tracks glyph mode", () => {
    let last: LibrationConfigV2 | null = null;
    render(
      <HourMarkersHarness
        initial={baseCustomHourMarkers({
          realization: { kind: "analogClock" },
        })}
      >
        {({ config }) => {
          last = config;
          return null;
        }}
      </HourMarkersHarness>,
    );

    fireEvent.change(screen.getByRole("combobox", { name: /Top-band hour marker glyph style/i }), {
      target: { value: "radialWedge" },
    });

    expect(last!.chrome.layout.hourMarkers.realization).toEqual({ kind: "radialWedge" });
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
    expect(last!.chrome.layout.hourMarkers.realization).toMatchObject({ color: "#aabbcc" });

    fireEvent.change(screen.getByRole("slider", { name: /Hour marker text size multiplier/i }), {
      target: { value: "1.5" },
    });
    expect(last!.chrome.layout.hourMarkers.layout.sizeMultiplier).toBe(1.5);
  });
});
