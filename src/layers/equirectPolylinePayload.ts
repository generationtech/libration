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

export const EQUIRECT_POLYLINE_KIND = "equirectPolyline" as const;

export interface EquirectangularPolylinePayload {
  kind: typeof EQUIRECT_POLYLINE_KIND;
  readonly points: readonly { latDeg: number; lonDeg: number }[];
  /** When true, adds a segment from last to first with longitude unwrapping. */
  closed: boolean;
}

export function isEquirectangularPolylinePayload(
  data: unknown,
): data is EquirectangularPolylinePayload {
  if (data === null || typeof data !== "object") {
    return false;
  }
  const o = data as Record<string, unknown>;
  if (o.kind !== EQUIRECT_POLYLINE_KIND || !Array.isArray(o.points) || typeof o.closed !== "boolean") {
    return false;
  }
  for (const p of o.points) {
    if (p === null || typeof p !== "object") {
      return false;
    }
    const q = p as Record<string, unknown>;
    if (typeof q.latDeg !== "number" || typeof q.lonDeg !== "number") {
      return false;
    }
  }
  return true;
}
