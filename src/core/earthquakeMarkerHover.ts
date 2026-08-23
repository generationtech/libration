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
 * Earthquake marker hover (LIB-060).
 * Screen-space hit descriptors and compact-label placement over already-visible
 * markers. Does not fetch, mutate product time, or persist hover state.
 */

import {
  IDENTITY_SCENE_CAMERA,
  sceneXFromLongitudeDeg,
  sceneYFromLatitudeDeg,
  type SceneCamera,
} from "./sceneCamera";

/** Padding added to the painted disc before the minimum hover radius applies. */
export const EARTHQUAKE_HOVER_PADDING_PX = 2;

/** Minimum CSS-pixel hover radius so small M2.5 discs remain usable. */
export const EARTHQUAKE_HOVER_MIN_RADIUS_PX = 7;

/** Gap between disc edge and hover-label anchor. */
export const EARTHQUAKE_HOVER_LABEL_GAP_PX = 6;

const SCREEN_MARGIN_PX = 8;
const WIDTH_PER_EM = 0.58;
const HEIGHT_EM = 1.15;

export type EarthquakeHoverFeature = {
  readonly id: string;
  readonly lonDeg: number;
  readonly latDeg: number;
  readonly magnitude?: number;
  readonly eventTimeMs?: number;
  readonly label?: string;
  readonly compactLabel?: string;
};

export type EarthquakeHoverHit = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly radiusPx: number;
  readonly hitRadiusPx: number;
  readonly magnitude?: number;
  readonly eventTimeMs?: number;
  readonly hasPersistentLabel: boolean;
  readonly compactLabel?: string;
};

export type PlacedEarthquakeHoverLabel = {
  readonly x: number;
  readonly y: number;
  readonly textAlign: "left" | "center" | "right";
  readonly textBaseline: "top" | "middle" | "bottom";
};

export type ScenePointerCss = {
  readonly x: number;
  readonly y: number;
};

/**
 * Painted earthquake disc radius in CSS pixels. Shared by RenderPlan and hit-test
 * so hover targets match what is drawn.
 */
export function earthquakeMarkerRadiusPx(
  magnitude: number | undefined,
  viewportWidthPx: number,
): number {
  const mag =
    magnitude !== undefined && Number.isFinite(magnitude)
      ? Math.max(0, magnitude)
      : 3;
  return Math.min(
    10,
    Math.max(2.5, (2.2 + mag * 0.85) * Math.max(0.7, viewportWidthPx / 1400)),
  );
}

export function earthquakeMarkerHitRadiusPx(renderedRadiusPx: number): number {
  return Math.max(
    renderedRadiusPx + EARTHQUAKE_HOVER_PADDING_PX,
    EARTHQUAKE_HOVER_MIN_RADIUS_PX,
  );
}

export function projectEarthquakeHoverHits(
  features: readonly EarthquakeHoverFeature[],
  viewportWidthPx: number,
  viewportHeightPx: number,
  camera: SceneCamera = IDENTITY_SCENE_CAMERA,
): EarthquakeHoverHit[] {
  const w = viewportWidthPx;
  const h = viewportHeightPx;
  if (!(w > 0) || !(h > 0)) {
    return [];
  }
  const hits: EarthquakeHoverHit[] = [];
  for (const feature of features) {
    const radiusPx = earthquakeMarkerRadiusPx(feature.magnitude, w);
    const persistent =
      feature.label !== undefined && feature.label.trim() !== "";
    hits.push({
      id: feature.id,
      x: sceneXFromLongitudeDeg(feature.lonDeg, w, camera),
      y: sceneYFromLatitudeDeg(feature.latDeg, h, camera),
      radiusPx,
      hitRadiusPx: earthquakeMarkerHitRadiusPx(radiusPx),
      hasPersistentLabel: persistent,
      ...(feature.magnitude !== undefined ? { magnitude: feature.magnitude } : {}),
      ...(feature.eventTimeMs !== undefined
        ? { eventTimeMs: feature.eventTimeMs }
        : {}),
      ...(feature.compactLabel !== undefined
        ? { compactLabel: feature.compactLabel }
        : {}),
    });
  }
  return hits;
}

/**
 * One hit: nearest center, then larger magnitude, then newer event, then stable id.
 */
export function pickHoveredEarthquakeHit(
  hits: readonly EarthquakeHoverHit[],
  pointerX: number,
  pointerY: number,
): EarthquakeHoverHit | null {
  let best: { hit: EarthquakeHoverHit; dist: number } | null = null;
  for (const hit of hits) {
    const dx = pointerX - hit.x;
    const dy = pointerY - hit.y;
    const dist = Math.hypot(dx, dy);
    if (dist > hit.hitRadiusPx) {
      continue;
    }
    if (best === null || hoverHitIsBetter(hit, dist, best.hit, best.dist)) {
      best = { hit, dist };
    }
  }
  return best?.hit ?? null;
}

function hoverHitIsBetter(
  candidate: EarthquakeHoverHit,
  candidateDist: number,
  incumbent: EarthquakeHoverHit,
  incumbentDist: number,
): boolean {
  if (candidateDist !== incumbentDist) {
    return candidateDist < incumbentDist;
  }
  const magA = candidate.magnitude ?? Number.NEGATIVE_INFINITY;
  const magB = incumbent.magnitude ?? Number.NEGATIVE_INFINITY;
  if (magA !== magB) {
    return magA > magB;
  }
  const tA = candidate.eventTimeMs ?? Number.NEGATIVE_INFINITY;
  const tB = incumbent.eventTimeMs ?? Number.NEGATIVE_INFINITY;
  if (tA !== tB) {
    return tA > tB;
  }
  return candidate.id < incumbent.id;
}

export function resolveEarthquakeHoverId(options: {
  features: readonly EarthquakeHoverFeature[];
  pointerSceneCss: ScenePointerCss | null;
  viewportWidthPx: number;
  viewportHeightPx: number;
  showLabelOnHover: boolean;
  camera?: SceneCamera;
}): string | null {
  if (!options.showLabelOnHover || options.pointerSceneCss === null) {
    return null;
  }
  const hits = projectEarthquakeHoverHits(
    options.features,
    options.viewportWidthPx,
    options.viewportHeightPx,
    options.camera ?? IDENTITY_SCENE_CAMERA,
  );
  const picked = pickHoveredEarthquakeHit(
    hits,
    options.pointerSceneCss.x,
    options.pointerSceneCss.y,
  );
  return picked?.id ?? null;
}

function estimateLabelBox(
  x: number,
  y: number,
  text: string,
  sizePx: number,
  textAlign: PlacedEarthquakeHoverLabel["textAlign"],
  textBaseline: PlacedEarthquakeHoverLabel["textBaseline"],
): { left: number; right: number; top: number; bottom: number } {
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

function boxOffScreen(
  box: { left: number; right: number; top: number; bottom: number },
  viewportWidthPx: number,
  viewportHeightPx: number,
): boolean {
  return (
    box.left < SCREEN_MARGIN_PX ||
    box.top < SCREEN_MARGIN_PX ||
    box.right > viewportWidthPx - SCREEN_MARGIN_PX ||
    box.bottom > viewportHeightPx - SCREEN_MARGIN_PX
  );
}

function discIntersectsBox(
  cx: number,
  cy: number,
  radiusPx: number,
  box: { left: number; right: number; top: number; bottom: number },
): boolean {
  const nearestX = Math.max(box.left, Math.min(cx, box.right));
  const nearestY = Math.max(box.top, Math.min(cy, box.bottom));
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy < radiusPx * radiusPx;
}

type HoverLabelCandidate = {
  readonly dx: number;
  readonly dy: number;
  readonly textAlign: PlacedEarthquakeHoverLabel["textAlign"];
  readonly textBaseline: PlacedEarthquakeHoverLabel["textBaseline"];
};

function hoverLabelCandidates(radiusPx: number): readonly HoverLabelCandidate[] {
  const offset = radiusPx + EARTHQUAKE_HOVER_LABEL_GAP_PX;
  return [
    { dx: offset, dy: 0, textAlign: "left", textBaseline: "middle" },
    { dx: -offset, dy: 0, textAlign: "right", textBaseline: "middle" },
    { dx: 0, dy: -offset, textAlign: "center", textBaseline: "bottom" },
    { dx: 0, dy: offset, textAlign: "center", textBaseline: "top" },
  ];
}

function clampHoverLabelPoint(
  x: number,
  y: number,
  text: string,
  sizePx: number,
  textAlign: PlacedEarthquakeHoverLabel["textAlign"],
  textBaseline: PlacedEarthquakeHoverLabel["textBaseline"],
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

/**
 * Right, left, above, below — avoid the marker disc and screen edges.
 * Not a general collision engine.
 */
export function placeEarthquakeHoverLabel(args: {
  readonly originX: number;
  readonly originY: number;
  readonly radiusPx: number;
  readonly text: string;
  readonly sizePx: number;
  readonly viewportWidthPx: number;
  readonly viewportHeightPx: number;
}): PlacedEarthquakeHoverLabel {
  const candidates = hoverLabelCandidates(args.radiusPx);
  for (const candidate of candidates) {
    const x = args.originX + candidate.dx;
    const y = args.originY + candidate.dy;
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
    if (discIntersectsBox(args.originX, args.originY, args.radiusPx, box)) {
      continue;
    }
    return {
      x,
      y,
      textAlign: candidate.textAlign,
      textBaseline: candidate.textBaseline,
    };
  }
  const fallback = candidates[0]!;
  const clamped = clampHoverLabelPoint(
    args.originX + fallback.dx,
    args.originY + fallback.dy,
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
