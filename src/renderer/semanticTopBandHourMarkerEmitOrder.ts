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
 * Phased top-band hour disks are tiled with wrap; near the −180°/180° seam two columns can both paint into the
 * viewport. Emit the structural column aligned with the present-time tick last so its procedural wall-clock
 * (analog / radial) occludes any overlapping neighbor disk.
 */
export function reorderLaidOutSemanticMarkersForPresentTickPaintOrder<
  T extends { structuralHour0To23: number },
>(laidOut: readonly T[], presentTimeStructuralHour0To23: number | undefined): readonly T[] {
  if (presentTimeStructuralHour0To23 === undefined || !Number.isFinite(presentTimeStructuralHour0To23)) {
    return laidOut;
  }
  const p = Math.max(0, Math.min(23, Math.floor(presentTimeStructuralHour0To23)));
  const match: T[] = [];
  const rest: T[] = [];
  for (const row of laidOut) {
    if (row.structuralHour0To23 === p) {
      match.push(row);
    } else {
      rest.push(row);
    }
  }
  return [...rest, ...match];
}
