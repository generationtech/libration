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

import {
  activeSolarEclipseAt,
  eclipseAuthoritySupport,
} from "./eclipseAuthority";
import { solarEclipseGeometryAt } from "./solarEclipseGeometry";
import type { EclipseFrame } from "./solarEclipseTypes";

let cached: EclipseFrame | null = null;

export function resolveEclipseFrame(utcMs: number): EclipseFrame {
  if (cached && cached.productUtcMs === utcMs) {
    return cached;
  }
  const support = eclipseAuthoritySupport(utcMs);
  if (!support.supported) {
    cached = {
      support,
      productUtcMs: utcMs,
      activeSolar: null,
      solarGeometry: null,
    };
    return cached;
  }
  const activeSolar = activeSolarEclipseAt(utcMs);
  cached = {
    support,
    productUtcMs: utcMs,
    activeSolar,
    solarGeometry: activeSolar ? solarEclipseGeometryAt(activeSolar, utcMs) : null,
  };
  return cached;
}

export function resetEclipseEventServiceCacheForTests(): void {
  cached = null;
}
