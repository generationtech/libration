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

import type { RenderPathCommand, RenderPathDescriptor } from "./pathTypes.ts";

export type PathBuilder = {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(cx: number, cy: number, r: number, start: number, end: number, ccw?: boolean): void;
  closePath(): void;
  build(): RenderPathDescriptor;
};

/**
 * Mutable recorder for {@link RenderPathDescriptor} — avoids hand-built command arrays in emitters.
 */
export function createPathBuilder(): PathBuilder {
  const cmds: RenderPathCommand[] = [];
  return {
    moveTo(x, y) {
      cmds.push({ kind: "moveTo", x, y });
    },
    lineTo(x, y) {
      cmds.push({ kind: "lineTo", x, y });
    },
    arc(cx, cy, r, start, end, ccw) {
      cmds.push(
        ccw !== undefined
          ? { kind: "arc", cx, cy, r, start, end, ccw }
          : { kind: "arc", cx, cy, r, start, end },
      );
    },
    closePath() {
      cmds.push({ kind: "closePath" });
    },
    build() {
      return { commands: [...cmds] };
    },
  };
}
