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

export const SUBSOLAR_MARKER_KIND = "subsolarMarkerEquirect" as const;

/**
 * Single subsolar point in equirectangular space (same convention as grid / shading:
 * lon −180…180 east positive, lat −90…90; x/y mapping is renderer responsibility).
 */
export interface SubsolarMarkerPayload {
  kind: typeof SUBSOLAR_MARKER_KIND;
  latDeg: number;
  lonDeg: number;
}

export function isSubsolarMarkerPayload(data: unknown): data is SubsolarMarkerPayload {
  if (data === null || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  return (
    o.kind === SUBSOLAR_MARKER_KIND &&
    typeof o.latDeg === "number" &&
    typeof o.lonDeg === "number"
  );
}
