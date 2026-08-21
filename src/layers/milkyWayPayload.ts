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

import type { OverlayReadabilityHints } from "./overlayReadabilityHints";
import { isOverlayReadabilityHints } from "./overlayReadabilityHints";
import type { MilkyWayGeometry } from "../core/milkyWayGeometry";
import type { MilkyWayPresentation } from "../core/milkyWayPresentation";
import type { MilkyWayVisibilityGeometry } from "../core/milkyWayVisibilityGeometry";
import type { MilkyWayEventMapLabel } from "../core/milkyWayEventLabel";
import type { GeographicRingPoint } from "../core/scalarFieldContours";

export const MILKY_WAY_KIND = "milkyWay" as const;

export type MilkyWayAvoidCityLabel = {
  readonly latDeg: number;
  readonly lonDeg: number;
  readonly name: string;
};

export type MilkyWayPayload = {
  readonly kind: typeof MILKY_WAY_KIND;
  readonly supported: boolean;
  readonly presentation: MilkyWayPresentation;
  readonly geometry: MilkyWayGeometry | null;
  readonly visibility: MilkyWayVisibilityGeometry | null;
  readonly eventLabel: MilkyWayEventMapLabel | null;
  readonly viewingFootprintRings?: readonly (readonly GeographicRingPoint[])[] | null;
  readonly labelAvoidCityLabels?: readonly MilkyWayAvoidCityLabel[];
  readonly readability?: OverlayReadabilityHints;
};

export function isMilkyWayPayload(data: unknown): data is MilkyWayPayload {
  if (data === null || typeof data !== "object") {
    return false;
  }
  const o = data as Record<string, unknown>;
  if (o.kind !== MILKY_WAY_KIND) {
    return false;
  }
  if (typeof o.supported !== "boolean") {
    return false;
  }
  if (o.readability !== undefined && !isOverlayReadabilityHints(o.readability)) {
    return false;
  }
  return o.presentation !== null && typeof o.presentation === "object";
}
