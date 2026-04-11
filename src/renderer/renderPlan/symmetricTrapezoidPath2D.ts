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
 * Axisymmetric trapezoid (symmetric about vertical line x = cx) for paddle necks and similar silhouettes.
 * {@link yTop} and {@link yBottom} need not be ordered; the path uses the min/max Y.
 */
export function symmetricTrapezoidPath2D(
  cx: number,
  yTop: number,
  yBottom: number,
  halfWidthTop: number,
  halfWidthBottom: number,
): Path2D {
  const yT = Math.min(yTop, yBottom);
  const yB = Math.max(yTop, yBottom);
  return new Path2D(
    `M ${cx - halfWidthTop},${yT} L ${cx + halfWidthTop},${yT} L ${cx + halfWidthBottom},${yB} L ${cx - halfWidthBottom},${yB} Z`,
  );
}
