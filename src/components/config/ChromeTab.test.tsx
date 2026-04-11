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
            customRepresentationEnabled: true,
            realization: { kind: "text", fontAssetId: "zeroes-one" },
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

  it("text branch shows font and size (no glyph style control)", () => {
    const initial = baseCustomHourMarkers({
      realization: { kind: "text", fontAssetId: "zeroes-one" },
    });
    render(<ChromeTabTestHarness initial={initial} />);

    expect(screen.getByRole("combobox", { name: /Top-band hour marker rendering kind/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Font for top-band hour disk numerals/i })).toBeEnabled();
    expect(screen.getByRole("slider", { name: /Hour marker text size multiplier/i })).toBeEnabled();
    expect(screen.queryByRole("combobox", { name: /Top-band hour marker glyph style/i })).toBeNull();
  });

  it("glyph branch shows glyph style only (no font or size controls)", () => {
    render(
      <ChromeTabTestHarness
        initial={baseCustomHourMarkers({
          realization: { kind: "analogClock" },
        })}
      />,
    );

    expect(screen.getByRole("combobox", { name: /Top-band hour marker glyph style/i })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /Font for top-band hour disk numerals/i })).toBeNull();
    expect(screen.queryByRole("slider", { name: /Hour marker text size multiplier/i })).toBeNull();
  });

  it("switching hour marker rendering to Glyph updates structured realization", () => {
    let last: LibrationConfigV2 | null = null;
    render(
      <ChromeTabTestHarness initial={baseCustomHourMarkers()}>
        {({ config }) => {
          last = config;
          return null;
        }}
      </ChromeTabTestHarness>,
    );

    fireEvent.change(screen.getByRole("combobox", { name: /Top-band hour marker rendering kind/i }), {
      target: { value: "glyph" },
    });

    expect(last!.chrome.layout.hourMarkers.realization).toEqual({ kind: "analogClock" });
  });

  it("font change updates structured hourMarkers realization", () => {
    let last: LibrationConfigV2 | null = null;
    render(
      <ChromeTabTestHarness
        initial={baseCustomHourMarkers({
          realization: { kind: "text", fontAssetId: "dseg7modern-regular" },
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
    expect(last!.chrome.layout.hourMarkers.realization).toMatchObject({ color: "#abcdef" });

    fireEvent.click(screen.getByRole("button", { name: /Clear hour marker color override/i }));
    expect((last!.chrome.layout.hourMarkers.realization as { color?: string }).color).toBeUndefined();
  });

  it("custom off keeps controls inert", () => {
    const initial = appConfigToV2(DEFAULT_APP_CONFIG);
    const lay = initial.chrome.layout;
    const rich = normalizeLibrationConfig({
      ...initial,
      chrome: {
        ...initial.chrome,
        layout: {
          ...lay,
          hourMarkers: {
            customRepresentationEnabled: false,
            realization: { kind: "text", fontAssetId: "dotmatrix-regular" },
            layout: { sizeMultiplier: 1 },
          },
        },
      },
    });

    render(<ChromeTabTestHarness initial={rich} />);

    expect(
      screen.getByRole("checkbox", {
        name: /Use custom font or glyph style for top-band 24 hour markers/i,
      }),
    ).not.toBeChecked();
    expect(screen.getByRole("combobox", { name: /Top-band hour marker rendering kind/i })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: /Font for top-band hour disk numerals/i })).toBeDisabled();
  });
});
