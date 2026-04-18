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
import { halfwayRgbStringBetweenCssColors } from "./halfwayRgbBetweenCssColors.ts";

describe("halfwayRgbStringBetweenCssColors", () => {
  it("is deterministic and halfway between #000000 and #ffffff", () => {
    expect(halfwayRgbStringBetweenCssColors("#000000", "#ffffff")).toBe("rgb(128, 128, 128)");
    expect(halfwayRgbStringBetweenCssColors("#ffffff", "#000000")).toBe("rgb(128, 128, 128)");
  });

  it("interpolates opaque rgb components", () => {
    expect(halfwayRgbStringBetweenCssColors("rgb(0, 0, 0)", "rgb(100, 200, 50)")).toBe("rgb(50, 100, 25)");
  });
});
