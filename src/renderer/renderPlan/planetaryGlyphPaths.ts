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
 * Internal vector astronomical symbols. Not platform emoji; not a downloaded icon pack.
 */

import type { PlanetaryBodyId } from "../../core/planetaryBodies";
import { createPathBuilder } from "./pathBuilder";
import type { RenderPathDescriptor } from "./pathTypes";

function planetaryGlyphPathDescriptor(
  body: PlanetaryBodyId,
  cx: number,
  cy: number,
  scalePx: number,
): RenderPathDescriptor {
  const b = createPathBuilder();
  const s = Math.max(0.5, scalePx);
  const x = (lx: number) => cx + lx * s;
  const y = (ly: number) => cy + ly * s;
  const r = (lr: number) => Math.max(0.4, lr * s);

  switch (body) {
    case "mercury": {
      b.arc(x(0), y(-0.08), r(0.38), 0, Math.PI * 2);
      b.moveTo(x(-0.42), y(-0.42));
      b.arc(x(-0.18), y(-0.55), r(0.28), Math.PI * 0.15, Math.PI * 1.15, true);
      b.moveTo(x(0.42), y(-0.42));
      b.arc(x(0.18), y(-0.55), r(0.28), Math.PI * 0.85, -Math.PI * 0.15, false);
      b.moveTo(x(0), y(0.3));
      b.lineTo(x(0), y(0.92));
      b.moveTo(x(-0.28), y(0.58));
      b.lineTo(x(0.28), y(0.58));
      break;
    }
    case "venus": {
      b.arc(x(0), y(-0.22), r(0.4), 0, Math.PI * 2);
      b.moveTo(x(0), y(0.18));
      b.lineTo(x(0), y(0.92));
      b.moveTo(x(-0.32), y(0.55));
      b.lineTo(x(0.32), y(0.55));
      break;
    }
    case "mars": {
      b.arc(x(-0.12), y(0.12), r(0.42), 0, Math.PI * 2);
      b.moveTo(x(0.18), y(-0.18));
      b.lineTo(x(0.72), y(-0.72));
      b.moveTo(x(0.28), y(-0.72));
      b.lineTo(x(0.72), y(-0.72));
      b.lineTo(x(0.72), y(-0.28));
      break;
    }
    case "jupiter": {
      b.moveTo(x(-0.15), y(-0.85));
      b.arc(x(-0.05), y(-0.42), r(0.42), -Math.PI * 0.85, Math.PI * 0.55, false);
      b.moveTo(x(-0.55), y(0.08));
      b.lineTo(x(0.55), y(0.08));
      b.moveTo(x(0.12), y(-0.55));
      b.lineTo(x(0.12), y(0.85));
      break;
    }
    case "saturn": {
      b.moveTo(x(0.22), y(-0.88));
      b.lineTo(x(0.22), y(0.88));
      b.moveTo(x(-0.42), y(-0.08));
      b.lineTo(x(0.62), y(-0.08));
      b.moveTo(x(0.22), y(-0.55));
      b.arc(x(-0.08), y(-0.15), r(0.48), -Math.PI * 0.65, Math.PI * 0.85, true);
      break;
    }
    case "uranus": {
      b.arc(x(0), y(0.18), r(0.36), 0, Math.PI * 2);
      b.moveTo(x(0), y(-0.18));
      b.lineTo(x(0), y(-0.88));
      b.moveTo(x(-0.32), y(-0.52));
      b.lineTo(x(0.32), y(-0.52));
      b.moveTo(x(-0.16), y(-0.88));
      b.lineTo(x(0), y(-1.05));
      b.lineTo(x(0.16), y(-0.88));
      break;
    }
    case "neptune": {
      b.moveTo(x(0), y(0.92));
      b.lineTo(x(0), y(-0.35));
      b.moveTo(x(-0.55), y(-0.15));
      b.lineTo(x(-0.55), y(-0.72));
      b.arc(x(0), y(-0.72), r(0.55), Math.PI, 0, false);
      b.lineTo(x(0.55), y(-0.15));
      b.moveTo(x(0), y(-0.72));
      b.lineTo(x(0), y(-1.02));
      b.moveTo(x(-0.28), y(0.55));
      b.lineTo(x(0.28), y(0.55));
      break;
    }
    case "pluto": {
      b.moveTo(x(-0.35), y(0.88));
      b.lineTo(x(-0.35), y(-0.72));
      b.arc(x(0.05), y(-0.38), r(0.4), -Math.PI * 0.55, Math.PI * 0.55, false);
      b.moveTo(x(-0.35), y(0.88));
      b.lineTo(x(0.55), y(0.88));
      break;
    }
    default: {
      const _exhaustive: never = body;
      return _exhaustive;
    }
  }
  return b.build();
}

export function planetarySymbolGlyphPathDescriptor(
  body: PlanetaryBodyId,
  cx: number,
  cy: number,
  scalePx: number,
): RenderPathDescriptor {
  return planetaryGlyphPathDescriptor(body, cx, cy, scalePx);
}
