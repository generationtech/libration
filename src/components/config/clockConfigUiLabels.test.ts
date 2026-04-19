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
import { labelForTopBandAnchorMode, labelForTopBandTimeMode } from "./clockConfigUiLabels";

describe("clockConfigUiLabels", () => {
  it("covers every TopBandTimeMode with a stable non-empty label", () => {
    expect(labelForTopBandTimeMode("local12")).toMatch(/local 12/i);
    expect(labelForTopBandTimeMode("local24")).toMatch(/local 24/i);
    expect(labelForTopBandTimeMode("utc24")).toMatch(/utc/i);
  });

  it("covers every top-band anchor mode with a stable non-empty label", () => {
    expect(labelForTopBandAnchorMode("auto")).toMatch(/auto/i);
    expect(labelForTopBandAnchorMode("fixedCity")).toMatch(/fixed city/i);
    expect(labelForTopBandAnchorMode("fixedLongitude")).toMatch(/fixed longitude/i);
  });
});
