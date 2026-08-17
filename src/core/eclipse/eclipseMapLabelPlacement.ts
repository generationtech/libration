/*
 * Libration
 * Copyright (C) 2026 Ken McDonald
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 */

/**
 * Deterministic screen-space offset for a map label near a Sun/Moon glyph.
 * Not a general collision engine.
 *
 * Solar path-aware order: opposite the nearest path sample, then ±45°, ±90°,
 * a farther opposite offset, then generic right/left/above/below.
 * Rejects glyph discs, path clearance, and screen edges. Last resort may drop
 * path clearance then clamp on-screen.
 */

export type LabelAvoidDisc = {
  readonly x: number;
  readonly y: number;
  readonly radiusPx: number;
};

export type PlacedMapLabel = {
  readonly x: number;
  readonly y: number;
  readonly textAlign: "left" | "center" | "right";
  readonly textBaseline: "top" | "middle" | "bottom";
};

export type LabelPathPolyline = {
  readonly points: readonly { readonly x: number; readonly y: number }[];
};

type LabelBox = {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
};

const SCREEN_MARGIN_PX = 8;
const GLYPH_GAP_PX = 8;
const PATH_CLEARANCE_PX = 12;
const LABEL_OFFSET_MIN_PX = 36;
const LABEL_OFFSET_MAX_PX = 64;
const WIDTH_PER_EM = 0.58;
const HEIGHT_EM = 1.15;

function estimateLabelBox(
  x: number,
  y: number,
  text: string,
  sizePx: number,
  textAlign: PlacedMapLabel["textAlign"],
  textBaseline: PlacedMapLabel["textBaseline"],
): LabelBox {
  const width = Math.max(sizePx, text.length * sizePx * WIDTH_PER_EM);
  const height = sizePx * HEIGHT_EM;
  let left = x - width / 2;
  if (textAlign === "left") {
    left = x;
  } else if (textAlign === "right") {
    left = x - width;
  }
  let top = y - height / 2;
  if (textBaseline === "top") {
    top = y;
  } else if (textBaseline === "bottom") {
    top = y - height;
  }
  return { left, right: left + width, top, bottom: top + height };
}

function boxOffScreen(box: LabelBox, viewportWidthPx: number, viewportHeightPx: number): boolean {
  return (
    box.left < SCREEN_MARGIN_PX ||
    box.top < SCREEN_MARGIN_PX ||
    box.right > viewportWidthPx - SCREEN_MARGIN_PX ||
    box.bottom > viewportHeightPx - SCREEN_MARGIN_PX
  );
}

function discIntersectsBox(disc: LabelAvoidDisc, box: LabelBox): boolean {
  const nearestX = Math.max(box.left, Math.min(disc.x, box.right));
  const nearestY = Math.max(box.top, Math.min(disc.y, box.bottom));
  const dx = disc.x - nearestX;
  const dy = disc.y - nearestY;
  return dx * dx + dy * dy < disc.radiusPx * disc.radiusPx;
}

function anyDiscIntersects(discs: readonly LabelAvoidDisc[], box: LabelBox): boolean {
  for (const disc of discs) {
    if (discIntersectsBox(disc, box)) {
      return true;
    }
  }
  return false;
}

function maxAvoidRadiusPx(discs: readonly LabelAvoidDisc[]): number {
  let max = 0;
  for (const disc of discs) {
    if (disc.radiusPx > max) {
      max = disc.radiusPx;
    }
  }
  return max;
}

function wrapCopiesX(x: number, viewportWidthPx: number): readonly number[] {
  return [x, x - viewportWidthPx, x + viewportWidthPx];
}

/**
 * Nearest screen-space path sample to the glyph, considering ±360° wrap copies.
 */
export function nearestEclipsePathPointScreen(args: {
  readonly originX: number;
  readonly originY: number;
  readonly polylines: readonly LabelPathPolyline[];
  readonly viewportWidthPx: number;
}): { readonly x: number; readonly y: number; readonly dist: number } | null {
  let best: { x: number; y: number; dist: number } | null = null;
  for (const line of args.polylines) {
    for (const p of line.points) {
      for (const x of wrapCopiesX(p.x, args.viewportWidthPx)) {
        const dx = x - args.originX;
        const dy = p.y - args.originY;
        const dist = Math.hypot(dx, dy);
        if (best === null || dist < best.dist) {
          best = { x, y: p.y, dist };
        }
      }
    }
  }
  return best;
}

function alignForDelta(
  dx: number,
  dy: number,
): Pick<Candidate, "textAlign" | "textBaseline"> {
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { textAlign: "left", textBaseline: "middle" }
      : { textAlign: "right", textBaseline: "middle" };
  }
  return dy >= 0
    ? { textAlign: "center", textBaseline: "top" }
    : { textAlign: "center", textBaseline: "bottom" };
}

function rotateUnit(ux: number, uy: number, deg: number): { ux: number; uy: number } {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return { ux: ux * c - uy * s, uy: ux * s + uy * c };
}

function oppositePathCandidates(ux: number, uy: number, offsetPx: number): readonly Candidate[] {
  const dirs: readonly { ux: number; uy: number; scale: number }[] = [
    { ux: -ux, uy: -uy, scale: 1 },
    { ...rotateUnit(-ux, -uy, 45), scale: 1 },
    { ...rotateUnit(-ux, -uy, -45), scale: 1 },
    { ...rotateUnit(-ux, -uy, 90), scale: 1 },
    { ...rotateUnit(-ux, -uy, -90), scale: 1 },
    { ux: -ux, uy: -uy, scale: 1.55 },
  ];
  return dirs.map((d) => {
    const dx = d.ux * offsetPx * d.scale;
    const dy = d.uy * offsetPx * d.scale;
    const align = alignForDelta(dx, dy);
    return { dx, dy, textAlign: align.textAlign, textBaseline: align.textBaseline };
  });
}

function segmentDistanceToBox(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  box: LabelBox,
): number {
  const samples = [
    { x: x1, y: y1 },
    { x: x2, y: y2 },
    { x: (x1 + x2) / 2, y: (y1 + y2) / 2 },
  ];
  let min = Infinity;
  for (const s of samples) {
    const nx = Math.max(box.left, Math.min(s.x, box.right));
    const ny = Math.max(box.top, Math.min(s.y, box.bottom));
    min = Math.min(min, Math.hypot(s.x - nx, s.y - ny));
  }
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 > 0) {
    const cx = (box.left + box.right) / 2;
    const cy = (box.top + box.bottom) / 2;
    let t = ((cx - x1) * dx + (cy - y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const qx = x1 + t * dx;
    const qy = y1 + t * dy;
    const nx = Math.max(box.left, Math.min(qx, box.right));
    const ny = Math.max(box.top, Math.min(qy, box.bottom));
    min = Math.min(min, Math.hypot(qx - nx, qy - ny));
  }
  return min;
}

function polylineHitsBox(
  polylines: readonly LabelPathPolyline[],
  box: LabelBox,
  clearancePx: number,
  viewportWidthPx: number,
): boolean {
  for (const line of polylines) {
    const pts = line.points;
    for (let i = 1; i < pts.length; i += 1) {
      const a = pts[i - 1]!;
      const b = pts[i]!;
      for (const ax of wrapCopiesX(a.x, viewportWidthPx)) {
        const bx = ax + (b.x - a.x);
        if (segmentDistanceToBox(ax, a.y, bx, b.y, box) < clearancePx) {
          return true;
        }
      }
    }
  }
  return false;
}

type Candidate = {
  readonly dx: number;
  readonly dy: number;
  readonly textAlign: PlacedMapLabel["textAlign"];
  readonly textBaseline: PlacedMapLabel["textBaseline"];
};

function candidatesForOffset(offsetPx: number): readonly Candidate[] {
  return [
    { dx: 0, dy: 0, textAlign: "center", textBaseline: "middle" },
    { dx: offsetPx, dy: 0, textAlign: "left", textBaseline: "middle" },
    { dx: -offsetPx, dy: 0, textAlign: "right", textBaseline: "middle" },
    { dx: 0, dy: -offsetPx, textAlign: "center", textBaseline: "bottom" },
    { dx: 0, dy: offsetPx, textAlign: "center", textBaseline: "top" },
  ];
}

function clampLabelPoint(
  x: number,
  y: number,
  text: string,
  sizePx: number,
  textAlign: PlacedMapLabel["textAlign"],
  textBaseline: PlacedMapLabel["textBaseline"],
  viewportWidthPx: number,
  viewportHeightPx: number,
): { x: number; y: number } {
  const box = estimateLabelBox(x, y, text, sizePx, textAlign, textBaseline);
  let nx = x;
  let ny = y;
  if (box.left < SCREEN_MARGIN_PX) {
    nx += SCREEN_MARGIN_PX - box.left;
  }
  if (box.right > viewportWidthPx - SCREEN_MARGIN_PX) {
    nx -= box.right - (viewportWidthPx - SCREEN_MARGIN_PX);
  }
  if (box.top < SCREEN_MARGIN_PX) {
    ny += SCREEN_MARGIN_PX - box.top;
  }
  if (box.bottom > viewportHeightPx - SCREEN_MARGIN_PX) {
    ny -= box.bottom - (viewportHeightPx - SCREEN_MARGIN_PX);
  }
  return { x: nx, y: ny };
}

export function placeEclipseMapLabel(args: {
  readonly preferredX: number;
  readonly preferredY: number;
  readonly text: string;
  readonly sizePx: number;
  readonly viewportWidthPx: number;
  readonly viewportHeightPx: number;
  readonly avoidDiscs: readonly LabelAvoidDisc[];
  readonly avoidPolylines?: readonly LabelPathPolyline[];
  readonly pathClearancePx?: number;
}): PlacedMapLabel {
  const halo = maxAvoidRadiusPx(args.avoidDiscs);
  const genericOffsetPx = halo + GLYPH_GAP_PX;
  const pathOffsetPx = Math.min(
    LABEL_OFFSET_MAX_PX,
    Math.max(LABEL_OFFSET_MIN_PX, halo + GLYPH_GAP_PX + 8),
  );
  const clearance = args.pathClearancePx ?? PATH_CLEARANCE_PX;
  const polylines = args.avoidPolylines ?? [];
  const nearest =
    polylines.length > 0
      ? nearestEclipsePathPointScreen({
          originX: args.preferredX,
          originY: args.preferredY,
          polylines,
          viewportWidthPx: args.viewportWidthPx,
        })
      : null;
  const list: Candidate[] = [];
  if (nearest && nearest.dist > 1) {
    const ux = (nearest.x - args.preferredX) / nearest.dist;
    const uy = (nearest.y - args.preferredY) / nearest.dist;
    list.push(...oppositePathCandidates(ux, uy, pathOffsetPx));
  }
  list.push(...candidatesForOffset(genericOffsetPx));
  const tryCandidate = (candidate: Candidate, enforcePath: boolean): PlacedMapLabel | null => {
    const x = args.preferredX + candidate.dx;
    const y = args.preferredY + candidate.dy;
    const box = estimateLabelBox(
      x,
      y,
      args.text,
      args.sizePx,
      candidate.textAlign,
      candidate.textBaseline,
    );
    if (boxOffScreen(box, args.viewportWidthPx, args.viewportHeightPx)) {
      return null;
    }
    if (anyDiscIntersects(args.avoidDiscs, box)) {
      return null;
    }
    if (enforcePath && polylines.length > 0 && polylineHitsBox(polylines, box, clearance, args.viewportWidthPx)) {
      return null;
    }
    return { x, y, textAlign: candidate.textAlign, textBaseline: candidate.textBaseline };
  };
  for (const candidate of list) {
    const placed = tryCandidate(candidate, true);
    if (placed) {
      return placed;
    }
  }
  for (const candidate of list) {
    const placed = tryCandidate(candidate, false);
    if (placed) {
      return placed;
    }
  }
  const fallback = list[0] ?? candidatesForOffset(genericOffsetPx)[1]!;
  const clamped = clampLabelPoint(
    args.preferredX + fallback.dx,
    args.preferredY + fallback.dy,
    args.text,
    args.sizePx,
    fallback.textAlign,
    fallback.textBaseline,
    args.viewportWidthPx,
    args.viewportHeightPx,
  );
  return {
    x: clamped.x,
    y: clamped.y,
    textAlign: fallback.textAlign,
    textBaseline: fallback.textBaseline,
  };
}
