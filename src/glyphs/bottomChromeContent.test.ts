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
    localMicroLabel: "LOCAL TIME",
    localTimeLine: "3:45 PM",
    localDateLine: "Apr 7, 2026",
    rightPanelDateLine: "Mon",
    bottomChromeLayout: layout,
    ...overrides,
  };
}

describe("bottomChromeReadoutContentFromInformationBar", () => {
  it("passes micro label and time strings through unchanged", () => {
    const c = bottomChromeReadoutContentFromInformationBar(ibSample());
    expect(c.label.label).toBe("LOCAL TIME");
    expect(c.time.label).toBe("3:45 PM");
  });

  it("uses nbsp for empty right panel date", () => {
    const c = bottomChromeReadoutContentFromInformationBar(ibSample({ rightPanelDateLine: "" }));
    expect(c.date.label).toBe("\u00a0");
  });
});
