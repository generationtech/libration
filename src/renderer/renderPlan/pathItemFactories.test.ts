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
import {
  clipPayloadDescriptor,
  clipPayloadPath2D,
  createDescriptorPathItem,
  createPath2DItem,
} from "./pathItemFactories.ts";

describe("pathItemFactories", () => {
  it("createPath2DItem sets pathKind path2d", () => {
    const path = new Path2D();
    const item = createPath2DItem({ path, fill: "#111" });
    expect(item.kind).toBe("path2d");
    expect(item.pathKind).toBe("path2d");
    if (item.pathKind === "path2d") {
      expect(item.path).toBe(path);
    }
  });

  it("createDescriptorPathItem sets pathKind descriptor", () => {
    const pathDescriptor = {
      commands: [{ kind: "moveTo" as const, x: 0, y: 0 }],
    };
    const item = createDescriptorPathItem({ pathDescriptor, fill: "#222" });
    expect(item.pathKind).toBe("descriptor");
    if (item.pathKind === "descriptor") {
      expect(item.pathDescriptor).toBe(pathDescriptor);
    }
  });

  it("embeds explicit clip payloads from helpers", () => {
    const clipPd = new Path2D();
    const clipDesc = { commands: [{ kind: "moveTo" as const, x: 1, y: 2 }] };
    expect(clipPayloadPath2D(clipPd)).toEqual({
      clipPathKind: "path2d",
      clipPath: clipPd,
    });
    expect(clipPayloadDescriptor(clipDesc)).toEqual({
      clipPathKind: "descriptor",
      clipPathDescriptor: clipDesc,
    });
    const a = createPath2DItem({
      path: new Path2D(),
      clip: clipPayloadPath2D(clipPd),
    });
    expect(a.clip).toMatchObject({ clipPathKind: "path2d" });
    const b = createDescriptorPathItem({
      pathDescriptor: { commands: [] },
      clip: clipPayloadDescriptor(clipDesc),
    });
    expect(b.clip).toMatchObject({ clipPathKind: "descriptor" });
  });
});
