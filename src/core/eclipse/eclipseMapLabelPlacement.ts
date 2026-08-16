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
 * Deterministic screen-space offset for a map label that would otherwise sit
 * on a Sun/Moon glyph halo. Not a general collision engine.
 *
 * Candidate order is fixed: preferred, then right, left, above, below.
 * The first on-screen non-intersecting candidate wins.
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

type LabelBox = {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
};

const SCREEN_MARGIN_PX = 8;
const GLYPH_GAP_PX = 8;
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
}): PlacedMapLabel {
  const offsetPx = maxAvoidRadiusPx(args.avoidDiscs) + GLYPH_GAP_PX;
  const list = candidatesForOffset(offsetPx);
  for (const candidate of list) {
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
      continue;
    }
    if (anyDiscIntersects(args.avoidDiscs, box)) {
      continue;
    }
    return { x, y, textAlign: candidate.textAlign, textBaseline: candidate.textBaseline };
  }
  const fallback = list[1] ?? list[0]!;
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
