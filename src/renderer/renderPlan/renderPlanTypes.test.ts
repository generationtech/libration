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
import type {
  RenderGradientStop,
  RenderLineCap,
  RenderLineItem,
  RenderPath2DItem,
  RenderClipPayload,
} from "./renderPlanTypes.ts";

describe("renderPlanTypes non-text contract", () => {
  it("RenderLineItem accepts shared line caps and matches gradient stop shape", () => {
    const caps: RenderLineCap[] = ["butt", "round", "square"];
    const line: RenderLineItem = {
      kind: "line",
      x1: 0,
      y1: 0,
      x2: 1,
      y2: 1,
      stroke: "rgba(0,0,0,1)",
      strokeWidthPx: 1,
      lineCap: caps[1],
    };
    expect(line.lineCap).toBe("round");

    const stop: RenderGradientStop = { offset: 0, color: "#fff" };
    expect(stop.offset).toBe(0);
  });

  it("RenderPath2DItem pathKind path2d carries Path2D payload", () => {
    const path = new Path2D();
    path.moveTo(0, 0);
    const item: RenderPath2DItem = { kind: "path2d", pathKind: "path2d", path, fill: "#000" };
    expect(item.pathKind).toBe("path2d");
    expect(item.path).toBeInstanceOf(Path2D);
  });

  it("RenderPath2DItem pathKind descriptor carries RenderPathDescriptor only", () => {
    const item: RenderPath2DItem = {
      kind: "path2d",
      pathKind: "descriptor",
      pathDescriptor: {
        commands: [
          { kind: "moveTo", x: 0, y: 0 },
          { kind: "lineTo", x: 1, y: 0 },
          { kind: "closePath" },
        ],
      },
      fill: "#111",
    };
    expect(item.pathDescriptor.commands).toHaveLength(3);
  });

  it("RenderPath2DItem accepts clip payload unions independent of path payload kind", () => {
    const clipPd: RenderClipPayload = {
      clipPathKind: "path2d",
      clipPath: new Path2D(),
    };
    const clipDesc: RenderClipPayload = {
      clipPathKind: "descriptor",
      clipPathDescriptor: {
        commands: [{ kind: "moveTo", x: 0, y: 0 }, { kind: "closePath" }],
      },
    };
    const path2dPrimary: RenderPath2DItem = {
      kind: "path2d",
      pathKind: "path2d",
      path: new Path2D(),
      fill: "#a",
      clip: clipDesc,
    };
    const descPrimary: RenderPath2DItem = {
      kind: "path2d",
      pathKind: "descriptor",
      pathDescriptor: { commands: [{ kind: "moveTo", x: 1, y: 1 }, { kind: "closePath" }] },
      fill: "#b",
      clip: clipPd,
    };
    expect(path2dPrimary.clip?.clipPathKind).toBe("descriptor");
    expect(descPrimary.clip?.clipPathKind).toBe("path2d");
  });
});
