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
import type { PlanetaryBodyId } from "../core/planetaryBodies";
import type { PlanetaryObjectsPresentation } from "../core/planetaryObjectsPresentation";
import type { PlanetarySubpointDeg } from "../core/planetarySubpoint";

export const PLANETARY_OBJECTS_KIND = "planetaryObjects" as const;

export type PlanetaryBodyRuntime = {
  readonly id: PlanetaryBodyId;
  readonly displayName: string;
  readonly color: string;
  readonly current: PlanetarySubpointDeg | null;
  readonly trackPast: readonly PlanetarySubpointDeg[];
  readonly trackFuture: readonly PlanetarySubpointDeg[];
  readonly locus: readonly PlanetarySubpointDeg[];
  readonly showCurrent: boolean;
  readonly showLabel: boolean;
  readonly showTrack: boolean;
  readonly showLocus: boolean;
};

export type PlanetaryObjectsPayload = {
  readonly kind: typeof PLANETARY_OBJECTS_KIND;
  readonly supported: boolean;
  readonly presentation: PlanetaryObjectsPresentation;
  readonly bodies: readonly PlanetaryBodyRuntime[];
  readonly readability?: OverlayReadabilityHints;
};

export function isPlanetaryObjectsPayload(data: unknown): data is PlanetaryObjectsPayload {
  if (data === null || typeof data !== "object") {
    return false;
  }
  const o = data as Record<string, unknown>;
  if (o.kind !== PLANETARY_OBJECTS_KIND) {
    return false;
  }
  if (typeof o.supported !== "boolean") {
    return false;
  }
  if (!Array.isArray(o.bodies)) {
    return false;
  }
  if (o.readability !== undefined && !isOverlayReadabilityHints(o.readability)) {
    return false;
  }
  return o.presentation !== null && typeof o.presentation === "object";
}
