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

/**
 * Backend-neutral path intent for {@link RenderPlan}: ordered commands any renderer can interpret.
 * {@link Path2D} is only the Canvas bridge payload on {@link ./renderPlanTypes.ts!RenderPath2DItem}
 * when `pathKind === "path2d"`; prefer `pathKind === "descriptor"` with a descriptor for shared geometry.
 * The same descriptors back optional clips via {@link ./renderPlanTypes.ts!RenderClipPayload} (`clipPathKind === "descriptor"`).
 */

/** One segment of a vector path — minimal set; migration adds more kinds gradually. */
export type RenderPathCommand =
  | { kind: "moveTo"; x: number; y: number }
  | { kind: "lineTo"; x: number; y: number }
  | {
      kind: "arc";
      cx: number;
      cy: number;
      r: number;
      start: number;
      end: number;
      /** When true, arc follows Canvas counterclockwise semantics (HTML `arc` anticlockwise). */
      ccw?: boolean;
    }
  | { kind: "closePath" };

/** Declarative path: inspectable and serializable unlike {@link Path2D}. */
export type RenderPathDescriptor = {
  commands: RenderPathCommand[];
};
