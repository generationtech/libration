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
 * Planetary subpoints, ground tracks, and loci in equirectangular scene space.
 * Canvas executes primitives only.
 */

import { parseCssColorToRgba8888 } from "../../color/contrastForegroundOnCssBackground";
import { PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID } from "../../config/productTextFont";
import { parallelYFromLatitudeDeg } from "../../core/equirectangularGridSampling";
import {
  IDENTITY_SCENE_CAMERA,
  sceneXFromIdentityX,
  sceneXFromLongitudeDeg,
  sceneYFromIdentityY,
  sceneYFromLatitudeDeg,
  type SceneCamera,
} from "../../core/sceneCamera";
import { astronomyPathStrokeWidthPx } from "../../core/astronomyOverlayStrokeAppearance";
import { placeEclipseMapLabel, type LabelAvoidBox, type LabelAvoidDisc } from "../../core/eclipse/eclipseMapLabelPlacement";
import {
  PLANETARY_LOCUS_OPACITY_01,
  planetaryGlyphSizeScale,
} from "../../core/planetaryObjectsPresentation";
import type { PlanetarySubpointDeg } from "../../core/planetarySubpoint";
import { effectiveOverlayReadabilityLiftVeil01 } from "../../layers/overlayReadabilityHints";
import type { PlanetaryObjectsPayload } from "../../layers/planetaryObjectsPayload";
import { circlePath2D } from "./circlePath2D";
import { createDescriptorPathItem } from "./pathItemFactories";
import { planetarySymbolGlyphPathDescriptor } from "./planetaryGlyphPaths";
import type { RenderLineItem, RenderPlan, RenderTextItem } from "./renderPlanTypes";
import {
  adjustPairToShortStripPath,
  equirectXFromUnwrappedLon,
  unwrappedLongitudes,
} from "./equirectSeamPath";

function strokeRgba(css: string, alpha: number): string {
  const px = parseCssColorToRgba8888(css);
  if (!px) {
    return `rgba(200, 200, 200, ${alpha})`;
  }
  return `rgba(${px.r}, ${px.g}, ${px.b}, ${alpha})`;
}

function mapLatToY(latDeg: number, viewportHeightPx: number): number {
  return parallelYFromLatitudeDeg(latDeg, viewportHeightPx);
}

function pushSeamAwarePolyline(
  items: RenderPlan["items"],
  points: readonly PlanetarySubpointDeg[],
  w: number,
  h: number,
  stroke: string,
  strokeWidthPx: number,
  camera: SceneCamera,
): void {
  if (points.length < 2) {
    return;
  }
  const lons = unwrappedLongitudes(points.map((p) => p.lonDeg));
  for (let i = 0; i < lons.length - 1; i += 1) {
    const raw0 = equirectXFromUnwrappedLon(lons[i]!, w);
    const raw1 = equirectXFromUnwrappedLon(lons[i + 1]!, w);
    const { x0, x1 } = adjustPairToShortStripPath(raw0, raw1, w);
    const y0 = mapLatToY(points[i]!.latDeg, h);
    const y1 = mapLatToY(points[i + 1]!.latDeg, h);
    if (!Number.isFinite(x0) || !Number.isFinite(x1) || !Number.isFinite(y0) || !Number.isFinite(y1)) {
      continue;
    }
    const line: RenderLineItem = {
      kind: "line",
      x1: sceneXFromIdentityX(x0, w, camera),
      y1: sceneYFromIdentityY(y0, h, camera),
      x2: sceneXFromIdentityX(x1, w, camera),
      y2: sceneYFromIdentityY(y1, h, camera),
      stroke,
      strokeWidthPx,
      lineCap: "round",
    };
    items.push(line);
  }
}

export interface PlanetaryObjectsRenderPlanOptions {
  viewportWidthPx: number;
  viewportHeightPx: number;
  camera?: SceneCamera;
  layerOpacity: number;
  payload: PlanetaryObjectsPayload;
}

/**
 * Build order: loci, ground tracks (future then past), current glyphs, labels.
 */
export function buildPlanetaryObjectsRenderPlan(
  options: PlanetaryObjectsRenderPlanOptions,
): RenderPlan {
  const w = options.viewportWidthPx;
  const h = options.viewportHeightPx;
  if (!(w > 0) || !(h > 0)) {
    return { items: [] };
  }
  const camera = options.camera ?? IDENTITY_SCENE_CAMERA;
  if (!options.payload.supported) {
    return { items: [] };
  }
  const op = Math.max(0, Math.min(1, options.layerOpacity));
  if (op <= 0) {
    return { items: [] };
  }
  const veil = effectiveOverlayReadabilityLiftVeil01(
    options.payload.readability?.nightVeil01,
    options.payload.readability?.overlayReadabilityLiftScale01,
  );
  const a = (alpha: number) => Math.min(0.92 * op, alpha * op * (1 + 0.28 * veil));
  const pres = options.payload.presentation;
  const trackWidth = astronomyPathStrokeWidthPx(veil, pres.groundTracks.thickness);
  const locusWidth = astronomyPathStrokeWidthPx(veil, pres.loci.thickness);
  const locusAlpha = PLANETARY_LOCUS_OPACITY_01[pres.loci.opacity];
  const sizeScale = planetaryGlyphSizeScale(pres.glyphSize);
  const items: RenderPlan["items"] = [];

  for (const body of options.payload.bodies) {
    if (body.showLocus && body.locus.length >= 2) {
      pushSeamAwarePolyline(
        items,
        body.locus,
        w,
        h,
        strokeRgba(body.color, a(locusAlpha)),
        locusWidth,
        camera,
      );
    }
  }

  for (const body of options.payload.bodies) {
    if (!body.showTrack || !body.current) {
      continue;
    }
    const futurePts = [body.current, ...body.trackFuture];
    const pastPts = [...body.trackPast, body.current];
    pushSeamAwarePolyline(items, futurePts, w, h, strokeRgba(body.color, a(0.38)), trackWidth, camera);
    pushSeamAwarePolyline(items, pastPts, w, h, strokeRgba(body.color, a(0.72)), trackWidth, camera);
  }

  const glyphRadius = Math.min(8.5, Math.max(4.4, 4.8 * Math.max(0.7, w / 1400))) * sizeScale;
  const placedGlyphs: LabelAvoidDisc[] = [];
  const glyphCenters: Array<{
    id: string;
    x: number;
    y: number;
    color: string;
    name: string;
    showLabel: boolean;
    r: number;
  }> = [];

  for (const body of options.payload.bodies) {
    if (!body.showCurrent || !body.current) {
      continue;
    }
    const gx = sceneXFromLongitudeDeg(body.current.lonDeg, w, camera);
    const gy = sceneYFromLatitudeDeg(body.current.latDeg, h, camera);
    if (!Number.isFinite(gx) || !Number.isFinite(gy)) {
      continue;
    }
    const r = glyphRadius;
    placedGlyphs.push({ x: gx, y: gy, radiusPx: r + 2 });
    glyphCenters.push({
      id: body.id,
      x: gx,
      y: gy,
      color: body.color,
      name: body.displayName,
      showLabel: body.showLabel,
      r,
    });
    if (pres.glyphType === "symbol") {
      const pathDescriptor = planetarySymbolGlyphPathDescriptor(body.id, gx, gy, r);
      items.push(
        createDescriptorPathItem({
          pathDescriptor,
          stroke: strokeRgba(body.color, a(0.96)),
          strokeWidthPx: Math.max(1.1, 1.35 * sizeScale),
        }),
      );
    } else {
      items.push({
        kind: "path2d",
        pathKind: "path2d",
        path: circlePath2D(gx, gy, r),
        fill: strokeRgba(body.color, a(0.96)),
        stroke: `rgba(12, 20, 28, ${a(0.85)})`,
        strokeWidthPx: Math.max(1, 1.2 * sizeScale),
      });
    }
  }

  const labelSize = Math.min(11, Math.max(8, w * 0.012));
  const placedBoxes: LabelAvoidBox[] = [];
  for (const glyph of glyphCenters) {
    if (!glyph.showLabel) {
      continue;
    }
    const placed = placeEclipseMapLabel({
      preferredX: glyph.x,
      preferredY: glyph.y,
      text: glyph.name,
      sizePx: labelSize,
      viewportWidthPx: w,
      viewportHeightPx: h,
      avoidDiscs: placedGlyphs,
      avoidBoxes: placedBoxes,
      placement: "lunar-glyph",
    });
    const width = Math.max(labelSize, glyph.name.length * labelSize * 0.58);
    const height = labelSize * 1.15;
    let left = placed.x - width / 2;
    if (placed.textAlign === "left") {
      left = placed.x;
    } else if (placed.textAlign === "right") {
      left = placed.x - width;
    }
    let top = placed.y - height / 2;
    if (placed.textBaseline === "top") {
      top = placed.y;
    } else if (placed.textBaseline === "bottom") {
      top = placed.y - height;
    }
    placedBoxes.push({ left, right: left + width, top, bottom: top + height });
    const text: RenderTextItem = {
      kind: "text",
      x: placed.x,
      y: placed.y,
      text: glyph.name,
      fill: strokeRgba(glyph.color, a(0.94)),
      font: {
        assetId: PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID,
        displayName: "Renderer default",
        sizePx: labelSize,
        weight: 500,
        style: "normal",
      },
      textAlign: placed.textAlign,
      textBaseline: placed.textBaseline === "middle" ? "middle" : placed.textBaseline,
      stroke: {
        color: `rgba(12, 20, 28, ${a(0.7)})`,
        widthPx: Math.max(2, labelSize * 0.28),
        lineJoin: "round",
        miterLimit: 2,
      },
      opacity: op,
    };
    items.push(text);
  }

  return { items };
}
