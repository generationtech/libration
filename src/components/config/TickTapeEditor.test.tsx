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
import { TickTapeEditor } from "./TickTapeEditor";

function TickTapeHarness({
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
      <TickTapeEditor config={config} updateConfig={updateConfig} />
      {children?.({ config })}
    </>
  );
}

describe("TickTapeEditor", () => {
  afterEach(() => {
    cleanup();
  });

  it("toggles chrome.layout.tickTapeVisible", () => {
    let last: LibrationConfigV2 | null = null;
    render(
      <TickTapeHarness initial={defaultLibrationConfigV2()}>
        {({ config }) => {
          last = config;
          return null;
        }}
      </TickTapeHarness>,
    );

    expect(last!.chrome.layout.tickTapeVisible).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: /Show 24-hour tickmarks tape in the top instrument strip/i }));
    expect(last!.chrome.layout.tickTapeVisible).toBe(false);
    fireEvent.click(screen.getByRole("checkbox", { name: /Show 24-hour tickmarks tape in the top instrument strip/i }));
    expect(last!.chrome.layout.tickTapeVisible).toBe(true);
  });

  it("disables the top chrome palette select while the tape is hidden", () => {
    const base = defaultLibrationConfigV2();
    const initial = normalizeLibrationConfig({
      ...base,
      chrome: {
        ...base.chrome,
        layout: {
          ...base.chrome.layout,
          tickTapeVisible: false,
        },
      },
    });
    render(<TickTapeEditor config={initial} updateConfig={() => {}} />);
    expect(screen.getByRole("combobox", { name: /Top instrument strip color palette/i })).toBeDisabled();
  });
});
