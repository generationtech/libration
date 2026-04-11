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
import { createPathBuilder } from "./pathBuilder.ts";

describe("createPathBuilder", () => {
  it("records moveTo, lineTo, arc, closePath and build() returns a copy", () => {
    const b = createPathBuilder();
    b.moveTo(1, 2);
    b.lineTo(3, 4);
    b.arc(0, 0, 5, 0, 1, true);
    b.closePath();
    const d = b.build();
    expect(d.commands).toEqual([
      { kind: "moveTo", x: 1, y: 2 },
      { kind: "lineTo", x: 3, y: 4 },
      { kind: "arc", cx: 0, cy: 0, r: 5, start: 0, end: 1, ccw: true },
      { kind: "closePath" },
    ]);
    d.commands.pop();
    expect(b.build().commands).toHaveLength(4);
  });

  it("omits ccw key on arc when not passed", () => {
    const b = createPathBuilder();
    b.arc(1, 2, 3, 0, Math.PI, undefined);
    const cmd = b.build().commands[0];
    expect(cmd).toEqual({ kind: "arc", cx: 1, cy: 2, r: 3, start: 0, end: Math.PI });
  });
});
