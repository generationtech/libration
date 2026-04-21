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

import { describe, expect, it } from "vitest";
import { computeBottomChromeLayout } from "../renderer/bottomChromeLayout";
import type { BottomInformationBarState } from "../renderer/bottomChromeTypes";
import { bottomChromeReadoutContentFromInformationBar } from "./bottomChromeContent";

function ibSample(overrides: Partial<BottomInformationBarState> = {}): BottomInformationBarState {
  const layout = computeBottomChromeLayout(800);
  return {
    bottomHudReadoutLines: [
      { role: "date", text: "April 7 2026" },
      { role: "time", text: "3:45:00 PM" },
    ],
    bottomChromeLayout: layout,
    ...overrides,
  };
}

describe("bottomChromeReadoutContentFromInformationBar", () => {
  it("maps each HUD row to a label payload (no row labels)", () => {
    const c = bottomChromeReadoutContentFromInformationBar(ibSample());
    expect(c.readoutLines).toHaveLength(2);
    expect(c.readoutLines[0]!.label).toBe("April 7 2026");
    expect(c.readoutLines[1]!.label).toBe("3:45:00 PM");
  });

  it("uses nbsp for an empty line", () => {
    const c = bottomChromeReadoutContentFromInformationBar(
      ibSample({ bottomHudReadoutLines: [{ role: "date", text: "" }] }),
    );
    expect(c.readoutLines[0]!.label).toBe("\u00a0");
  });
});
