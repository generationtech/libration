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
 * Restrained nearest/active eclipse map labels. Presentation only.
 */

import { lunarEclipseTypeTitle, solarEclipseTypeTitle } from "./eclipseEventCopy";
import type { LunarEclipseEvent } from "./lunarEclipseTypes";
import type { SolarEclipseEvent } from "./solarEclipseTypes";

export type EclipseMapLabel = {
  readonly latDeg: number;
  readonly lonDeg: number;
  readonly text: string;
};

export function solarEclipseMapLabel(args: {
  readonly event: SolarEclipseEvent;
  readonly lifecycle: "upcoming" | "active";
  readonly productUtcMs: number;
  readonly latDeg: number;
  readonly lonDeg: number;
}): EclipseMapLabel {
  const title = solarEclipseTypeTitle(args.event.subtype);
  const lifecycle = args.lifecycle === "active" ? "active" : "upcoming";
  return { latDeg: args.latDeg, lonDeg: args.lonDeg, text: `${title} · ${lifecycle}` };
}

export function lunarEclipseMapLabel(args: {
  readonly event: LunarEclipseEvent;
  readonly lifecycle: "upcoming" | "active";
  readonly productUtcMs: number;
  readonly latDeg: number;
  readonly lonDeg: number;
}): EclipseMapLabel {
  const title = lunarEclipseTypeTitle(args.event.subtype);
  const lifecycle = args.lifecycle === "active" ? "active" : "upcoming";
  return { latDeg: args.latDeg, lonDeg: args.lonDeg, text: `${title} · ${lifecycle}` };
}
