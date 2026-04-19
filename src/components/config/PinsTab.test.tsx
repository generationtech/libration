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
import { PinsTab } from "./PinsTab";

function PinsTabTestHarness({
  initial,
  children,
}: {
  initial: LibrationConfigV2;
  children?: (ctx: { config: LibrationConfigV2 }) => ReactNode;
}) {
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
      <PinsTab config={config} updateConfig={updateConfig} />
      {children?.({ config })}
    </>
  );
}

describe("PinsTab pin labels", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders Viewpoint & visible cities section", () => {
    const initial = defaultLibrationConfigV2();
    render(<PinsTabTestHarness initial={initial} />);
    expect(screen.getByTestId("pins-section-viewpoint")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Viewpoint & visible cities" }),
    ).toBeInTheDocument();
  });

  it("stores split city name and date/time font overrides and clears on Default (typography role)", () => {
    let last: LibrationConfigV2 | null = null;
    const initial = defaultLibrationConfigV2();
    render(
      <PinsTabTestHarness initial={initial}>
        {({ config }) => {
          last = config;
          return null;
        }}
      </PinsTabTestHarness>,
    );
    fireEvent.change(screen.getByTestId("pins-pin-city-name-font-select"), {
      target: { value: "computer" },
    });
    expect(last!.pins.presentation.pinCityNameFontAssetId).toBe("computer");
    fireEvent.change(screen.getByTestId("pins-pin-datetime-font-select"), {
      target: { value: "flip-clock" },
    });
    expect(last!.pins.presentation.pinDateTimeFontAssetId).toBe("flip-clock");
    fireEvent.change(screen.getByTestId("pins-pin-city-name-font-select"), { target: { value: "" } });
    expect(last!.pins.presentation.pinCityNameFontAssetId).toBeUndefined();
    fireEvent.change(screen.getByTestId("pins-pin-datetime-font-select"), { target: { value: "" } });
    expect(last!.pins.presentation.pinDateTimeFontAssetId).toBeUndefined();
  });

  it("writes pinDateTimeDisplayMode to structured config", () => {
    let last: LibrationConfigV2 | null = null;
    const initial = defaultLibrationConfigV2();
    render(
      <PinsTabTestHarness initial={initial}>
        {({ config }) => {
          last = config;
          return null;
        }}
      </PinsTabTestHarness>,
    );
    fireEvent.change(screen.getByTestId("pins-pin-datetime-display-mode-select"), {
      target: { value: "dateOnly" },
    });
    expect(last!.pins.presentation.pinDateTimeDisplayMode).toBe("dateOnly");
  });
});
