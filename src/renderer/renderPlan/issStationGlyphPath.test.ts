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
import { issStationGlyphPathDescriptor } from "./issStationGlyphPath";

describe("issStationGlyphPathDescriptor", () => {
  it("emits a closed multi-rect silhouette around the origin", () => {
    const path = issStationGlyphPathDescriptor(100, 50, 6, Math.PI / 2);
    expect(path.commands.length).toBeGreaterThan(8);
    expect(path.commands.some((c) => c.kind === "moveTo")).toBe(true);
    expect(path.commands.filter((c) => c.kind === "closePath").length).toBe(4);
    const xs = path.commands.flatMap((c) =>
      c.kind === "moveTo" || c.kind === "lineTo" ? [c.x] : [],
    );
    const ys = path.commands.flatMap((c) =>
      c.kind === "moveTo" || c.kind === "lineTo" ? [c.y] : [],
    );
    expect(Math.min(...xs)).toBeLessThan(100);
    expect(Math.max(...xs)).toBeGreaterThan(100);
    expect(Math.min(...ys)).toBeLessThan(50);
    expect(Math.max(...ys)).toBeGreaterThan(50);
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanY = Math.max(...ys) - Math.min(...ys);
    expect(spanX).toBeGreaterThan(spanY);
  });
});
