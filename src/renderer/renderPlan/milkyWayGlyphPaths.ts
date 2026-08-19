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
 * Internal vector glyphs for Galactic center and anticenter. Not emoji.
 */

import { createPathBuilder } from "./pathBuilder";
import type { RenderPathDescriptor } from "./pathTypes";

export function galacticCenterGlyphPathDescriptor(
  cx: number,
  cy: number,
  scalePx: number,
): RenderPathDescriptor {
  const b = createPathBuilder();
  const s = Math.max(0.5, scalePx);
  const x = (lx: number) => cx + lx * s;
  const y = (ly: number) => cy + ly * s;
  b.moveTo(x(0), y(-1));
  b.lineTo(x(0.22), y(-0.22));
  b.lineTo(x(1), y(0));
  b.lineTo(x(0.22), y(0.22));
  b.lineTo(x(0), y(1));
  b.lineTo(x(-0.22), y(0.22));
  b.lineTo(x(-1), y(0));
  b.lineTo(x(-0.22), y(-0.22));
  b.closePath();
  b.arc(x(0), y(0), Math.max(0.4, 0.18 * s), 0, Math.PI * 2);
  return b.build();
}

export function galacticAnticenterGlyphPathDescriptor(
  cx: number,
  cy: number,
  scalePx: number,
): RenderPathDescriptor {
  const b = createPathBuilder();
  const s = Math.max(0.5, scalePx) * 0.78;
  const x = (lx: number) => cx + lx * s;
  const y = (ly: number) => cy + ly * s;
  b.moveTo(x(0), y(-0.95));
  b.lineTo(x(0.7), y(0));
  b.lineTo(x(0), y(0.95));
  b.lineTo(x(-0.7), y(0));
  b.closePath();
  return b.build();
}
