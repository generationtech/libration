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
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  DEMO_TIME_SPEED_MAX,
  DEMO_TIME_SPEED_MIN,
} from "../../config/appConfig";
import { getActiveAppConfig } from "../../config/displayPresets";
import { resolveDisplayTimeReferenceZone } from "../../core/displayTimeReference";
import { formatWallClockInTimeZone } from "../../core/timeFormat";
import { effectiveDemoWallClockZone } from "./demoTimeStartIso";
import {
  appConfigToV2,
  normalizeLibrationConfig,
  type LibrationConfigV2,
} from "../../config/v2/librationConfig";
import { DataTab } from "./DataTab";

function DataTabTestHarness({
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
      <DataTab config={config} updateConfig={updateConfig} />
      {children?.({ config })}
    </>
  );
}

describe("DataTab demo time UX", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("initializes demo start to current UTC instant once on Static → Demo mode change", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2022-05-04T15:30:00.000Z"));
    const initial = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));

    let lastConfig: LibrationConfigV2 | null = null;
    render(
      <DataTabTestHarness initial={initial}>
        {({ config }) => {
          lastConfig = config;
          return null;
        }}
      </DataTabTestHarness>,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Data pipeline mode" }), {
      target: { value: "demo" },
    });

    expect(lastConfig!.data.mode).toBe("demo");
    expect(lastConfig!.data.demoTime.startIsoUtc).toBe("2022-05-04T15:30:00.000Z");

    vi.setSystemTime(new Date("2099-01-01T00:00:00.000Z"));
    fireEvent.click(screen.getByRole("checkbox", { name: "Show data annotations when available" }));

    expect(lastConfig!.data.demoTime.startIsoUtc).toBe("2022-05-04T15:30:00.000Z");
  });

  it("re-initializes demo start only on each Static → Demo transition", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2021-01-01T12:00:00.000Z"));
    const initial = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));

    let lastConfig: LibrationConfigV2 | null = null;
    render(
      <DataTabTestHarness initial={initial}>
        {({ config }) => {
          lastConfig = config;
          return null;
        }}
      </DataTabTestHarness>,
    );

    const modeSelect = screen.getByRole("combobox", { name: "Data pipeline mode" });

    fireEvent.change(modeSelect, { target: { value: "demo" } });
    expect(lastConfig!.data.demoTime.startIsoUtc).toBe("2021-01-01T12:00:00.000Z");

    vi.setSystemTime(new Date("2021-06-01T00:00:00.000Z"));
    fireEvent.change(modeSelect, { target: { value: "static" } });
    fireEvent.change(modeSelect, { target: { value: "demo" } });
    expect(lastConfig!.data.demoTime.startIsoUtc).toBe("2021-06-01T00:00:00.000Z");
  });

  it("Use current time commits startIsoUtc and refreshes date/time fields", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-08-16T09:00:00.000Z"));
    const initial = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    const dt = initial.chrome.displayTime;
    const wallZone = effectiveDemoWallClockZone(
      dt.topBandMode,
      resolveDisplayTimeReferenceZone(dt.referenceTimeZone),
    );
    const hour12 = dt.topBandMode === "local12";

    render(<DataTabTestHarness initial={initial} />);

    fireEvent.change(screen.getByRole("combobox", { name: "Data pipeline mode" }), {
      target: { value: "demo" },
    });

    const dateInput = screen.getByLabelText("Demo start date") as HTMLInputElement;
    const timeInput = screen.getByLabelText("Demo start time") as HTMLInputElement;

    expect(dateInput.value).toBe("2024-08-16");
    expect(timeInput.value).toBe(
      formatWallClockInTimeZone(Date.UTC(2024, 7, 16, 9, 0, 0, 0), wallZone, hour12),
    );

    vi.setSystemTime(new Date("2024-12-25T18:45:30.123Z"));
    fireEvent.click(screen.getByRole("button", { name: "Set demo start to current time" }));

    expect(dateInput.value).toBe("2024-12-25");
    expect(timeInput.value).toBe(
      formatWallClockInTimeZone(Date.UTC(2024, 11, 25, 18, 45, 30, 123), wallZone, hour12),
    );
  });

  it("accepts playback speed up to DEMO_TIME_SPEED_MAX and normalizes above max", async () => {
    const user = userEvent.setup();
    const initial = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));

    let lastConfig: LibrationConfigV2 | null = null;
    render(
      <DataTabTestHarness initial={initial}>
        {({ config }) => {
          lastConfig = config;
          return null;
        }}
      </DataTabTestHarness>,
    );

    await user.selectOptions(screen.getByRole("combobox", { name: "Data pipeline mode" }), "demo");

    const speedInput = screen.getByRole("spinbutton", { name: "Playback speed" });
    expect(speedInput).toHaveAttribute("min", String(DEMO_TIME_SPEED_MIN));
    expect(speedInput).toHaveAttribute("max", String(DEMO_TIME_SPEED_MAX));

    fireEvent.change(speedInput, { target: { value: String(DEMO_TIME_SPEED_MAX) } });
    expect(lastConfig!.data.demoTime.speedMultiplier).toBe(DEMO_TIME_SPEED_MAX);

    fireEvent.change(speedInput, { target: { value: String(DEMO_TIME_SPEED_MAX + 50_000) } });
    expect(lastConfig!.data.demoTime.speedMultiplier).toBe(DEMO_TIME_SPEED_MAX);
  });
});
