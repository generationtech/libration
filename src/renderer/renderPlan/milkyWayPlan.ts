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
 * Milky Way zenith ribbon in equirectangular scene space.
 * Canvas executes primitives only.
 */

import { parseCssColorToRgba8888 } from "../../color/contrastForegroundOnCssBackground";
import { PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID } from "../../config/productTextFont";
import { cityPinNameLabelScreenBox } from "../../layers/cityPinsPayload";
import { parallelYFromLatitudeDeg } from "../../core/equirectangularGridSampling";
import {
  IDENTITY_SCENE_CAMERA,
  sceneCameraHorizontalWorldCopyOffsets,
  sceneXFromIdentityX,
  sceneXFromLongitudeDeg,
  sceneXShiftForWorldCopy,
  sceneYFromIdentityY,
  sceneYFromLatitudeDeg,
  type SceneCamera,
} from "../../core/sceneCamera";
import { astronomyPathStrokeWidthPx } from "../../core/astronomyOverlayStrokeAppearance";
import {
  eclipseMapLabelBox,
  placeEclipseMapLabel,
  type LabelAvoidBox,
  type LabelAvoidDisc,
  type LabelPathPolyline,
} from "../../core/eclipse/eclipseMapLabelPlacement";
import type { MilkyWayTaggedPoint } from "../../core/milkyWayGeometry";
import { effectiveOverlayReadabilityLiftVeil01 } from "../../layers/overlayReadabilityHints";
import type { MilkyWayPayload } from "../../layers/milkyWayPayload";
import { createDescriptorPathItem } from "./pathItemFactories";
import {
  galacticAnticenterGlyphPathDescriptor,
  galacticCenterGlyphPathDescriptor,
} from "./milkyWayGlyphPaths";
import type { RenderLineItem, RenderPlan, RenderTextItem } from "./renderPlanTypes";
import {
  adjustPairToShortStripPath,
  equirectXFromUnwrappedLon,
  unwrappedLongitudes,
} from "./equirectSeamPath";
import type { MilkyWayGcAltitudeContourDeg } from "../../core/milkyWayPresentation";
import {
  milkyWayVisibilityNightFactor,
  type MilkyWayVisibilitySample,
} from "../../core/milkyWayVisibilityGeometry";

const GALACTIC_CENTER_LABEL = "Galactic center";
const DAY_ALPHA = 0.28;
const NIGHT_ALPHA = 0.78;
const UNIFORM_ALPHA = 0.62;

const CONTOUR_BASE_ALPHA: Record<MilkyWayGcAltitudeContourDeg, number> = {
  0: 0.22,
  30: 0.35,
  45: 0.5,
  60: 0.68,
  75: 0.85,
};

const CONTOUR_WIDTH_MULT: Record<MilkyWayGcAltitudeContourDeg, number> = {
  0: 0.82,
  30: 0.9,
  45: 1,
  60: 1.08,
  75: 1.18,
};

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

function segmentAlpha(aNight: boolean, bNight: boolean, emphasizeNight: boolean): number {
  if (!emphasizeNight) {
    return UNIFORM_ALPHA;
  }
  if (aNight && bNight) {
    return NIGHT_ALPHA;
  }
  if (!aNight && !bNight) {
    return DAY_ALPHA;
  }
  return (NIGHT_ALPHA + DAY_ALPHA) / 2;
}

function pushSeamAwarePolyline(
  items: RenderPlan["items"],
  points: readonly MilkyWayTaggedPoint[],
  w: number,
  h: number,
  camera: SceneCamera,
  colorCss: string,
  strokeWidthPx: number,
  alphaFn: (a: MilkyWayTaggedPoint, b: MilkyWayTaggedPoint) => number,
): void {
  if (points.length < 2) {
    return;
  }
  const lons = unwrappedLongitudes(points.map((p) => p.lonDeg));
  const copies = sceneCameraHorizontalWorldCopyOffsets(camera, w);
  for (let i = 0; i < lons.length - 1; i += 1) {
    const raw0 = equirectXFromUnwrappedLon(lons[i]!, w);
    const raw1 = equirectXFromUnwrappedLon(lons[i + 1]!, w);
    const { x0, x1 } = adjustPairToShortStripPath(raw0, raw1, w);
    const y0 = mapLatToY(points[i]!.latDeg, h);
    const y1 = mapLatToY(points[i + 1]!.latDeg, h);
    if (!Number.isFinite(x0) || !Number.isFinite(x1) || !Number.isFinite(y0) || !Number.isFinite(y1)) {
      continue;
    }
    for (const k of copies) {
      const line: RenderLineItem = {
        kind: "line",
        x1: sceneXFromIdentityX(x0 + k * w, w, camera),
        y1: sceneYFromIdentityY(y0, h, camera),
        x2: sceneXFromIdentityX(x1 + k * w, w, camera),
        y2: sceneYFromIdentityY(y1, h, camera),
        stroke: strokeRgba(colorCss, alphaFn(points[i]!, points[i + 1]!)),
        strokeWidthPx,
        lineCap: "round",
      };
      items.push(line);
    }
  }
}

function visibilitySegmentAlpha(
  a: MilkyWayVisibilitySample,
  b: MilkyWayVisibilitySample,
  emphasizeNight: boolean,
  deemphasizeMoon: boolean,
  baseAlpha: number,
): number {
  const night = emphasizeNight
    ? (milkyWayVisibilityNightFactor(a.solarAltitudeDeg) +
        milkyWayVisibilityNightFactor(b.solarAltitudeDeg)) /
      2
    : 1;
  const moon = deemphasizeMoon ? (a.moonFactor + b.moonFactor) / 2 : 1;
  return baseAlpha * night * moon;
}

function pushVisibilityContour(
  items: RenderPlan["items"],
  points: readonly MilkyWayVisibilitySample[],
  w: number,
  h: number,
  camera: SceneCamera,
  colorCss: string,
  strokeWidthPx: number,
  baseAlpha: number,
  emphasizeNight: boolean,
  deemphasizeMoon: boolean,
  alphaScale: (alpha: number) => number,
): void {
  if (points.length < 2) {
    return;
  }
  const lons = unwrappedLongitudes(points.map((p) => p.lonDeg));
  const copies = sceneCameraHorizontalWorldCopyOffsets(camera, w);
  for (let i = 0; i < lons.length - 1; i += 1) {
    const p0 = points[i]!;
    const p1 = points[i + 1]!;
    if (
      Math.abs(p0.latDeg) > 86 &&
      Math.abs(p1.latDeg) > 86 &&
      Math.abs(lons[i + 1]! - lons[i]!) > 20
    ) {
      continue;
    }
    const raw0 = equirectXFromUnwrappedLon(lons[i]!, w);
    const raw1 = equirectXFromUnwrappedLon(lons[i + 1]!, w);
    const { x0, x1 } = adjustPairToShortStripPath(raw0, raw1, w);
    const y0 = mapLatToY(p0.latDeg, h);
    const y1 = mapLatToY(p1.latDeg, h);
    if (!Number.isFinite(x0) || !Number.isFinite(x1) || !Number.isFinite(y0) || !Number.isFinite(y1)) {
      continue;
    }
    if (Math.abs(x1 - x0) > w * 0.48) {
      continue;
    }
    for (const k of copies) {
      const line: RenderLineItem = {
        kind: "line",
        x1: sceneXFromIdentityX(x0 + k * w, w, camera),
        y1: sceneYFromIdentityY(y0, h, camera),
        x2: sceneXFromIdentityX(x1 + k * w, w, camera),
        y2: sceneYFromIdentityY(y1, h, camera),
        stroke: strokeRgba(
          colorCss,
          alphaScale(visibilitySegmentAlpha(p0, p1, emphasizeNight, deemphasizeMoon, baseAlpha)),
        ),
        strokeWidthPx,
        lineCap: "round",
      };
      items.push(line);
    }
  }
}

function screenPolylines(
  points: readonly MilkyWayTaggedPoint[],
  w: number,
  h: number,
  camera: SceneCamera,
): LabelPathPolyline[] {
  const copies = sceneCameraHorizontalWorldCopyOffsets(camera, w);
  const base = points.map((p) => ({
    x: sceneXFromLongitudeDeg(p.lonDeg, w, camera),
    y: sceneYFromLatitudeDeg(p.latDeg, h, camera),
  }));
  return copies.map((k) => ({
    points: base.map((p) => ({
      x: p.x + sceneXShiftForWorldCopy(w, camera, k),
      y: p.y,
    })),
  }));
}

export interface MilkyWayRenderPlanOptions {
  viewportWidthPx: number;
  viewportHeightPx: number;
  camera?: SceneCamera;
  layerOpacity: number;
  payload: MilkyWayPayload;
}

/**
 * Build order: band edges, ribs, Galactic plane, visibility contours, glyphs, labels.
 */
export function buildMilkyWayRenderPlan(options: MilkyWayRenderPlanOptions): RenderPlan {
  const w = options.viewportWidthPx;
  const h = options.viewportHeightPx;
  if (!(w > 0) || !(h > 0)) {
    return { items: [] };
  }
  const camera = options.camera ?? IDENTITY_SCENE_CAMERA;
  if (!options.payload.supported) {
    return { items: [] };
  }
  const eventLabel = options.payload.eventLabel;
  const footprintRings = options.payload.viewingFootprintRings;
  if (!options.payload.geometry && !eventLabel && !(footprintRings && footprintRings.length > 0)) {
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
  const a = (alpha: number) => Math.min(0.92 * op, alpha * op * (1 + 0.22 * veil));
  const pres = options.payload.presentation;
  const geom = options.payload.geometry;
  const emphasize = pres.emphasizeNightSide;
  const items: RenderPlan["items"] = [];

  const alphaFor = (p0: MilkyWayTaggedPoint, p1: MilkyWayTaggedPoint) =>
    a(segmentAlpha(p0.night, p1.night, emphasize));

  if (geom) {
  const planeWidth = astronomyPathStrokeWidthPx(veil, pres.planeThickness);
  const bandWidth = Math.max(0.7, astronomyPathStrokeWidthPx(veil, pres.bandThickness) * 0.85);

  if (pres.bandEnabled) {
    pushSeamAwarePolyline(items, geom.northEdge, w, h, camera, pres.bandColor, bandWidth, alphaFor);
    pushSeamAwarePolyline(items, geom.southEdge, w, h, camera, pres.bandColor, bandWidth, alphaFor);
  }
  if (pres.ribsEnabled && pres.bandEnabled) {
    for (const rib of geom.ribs) {
      pushSeamAwarePolyline(items, rib.points, w, h, camera, pres.bandColor, bandWidth, alphaFor);
    }
  }
  if (pres.planeEnabled) {
    pushSeamAwarePolyline(items, geom.plane, w, h, camera, pres.planeColor, planeWidth, alphaFor);
  }

  const vis = options.payload.visibility;
  if (pres.visibilityContoursEnabled && vis) {
    const visWidth = astronomyPathStrokeWidthPx(veil, pres.visibilityThickness);
    for (const contour of vis.contours) {
      pushVisibilityContour(
        items,
        contour.points,
        w,
        h,
        camera,
        pres.visibilityColor,
        Math.max(0.7, visWidth * CONTOUR_WIDTH_MULT[contour.altitudeDeg]),
        CONTOUR_BASE_ALPHA[contour.altitudeDeg],
        pres.emphasizeAstronomicalNight,
        pres.deemphasizeMoonlight,
        a,
      );
    }
    if (pres.showVisibilityContourLabels) {
      const contourLabelSize = Math.min(10, Math.max(7, w * 0.011));
      const preferredLon = vis.galacticCenter.lonDeg + 50;
      for (const contour of vis.contours) {
        const unique = contour.points.slice(0, Math.max(0, contour.points.length - 1));
        let best: MilkyWayVisibilitySample | null = null;
        let bestScore = Infinity;
        for (const p of unique) {
          if (Math.abs(p.latDeg) > 72) {
            continue;
          }
          const dLon = Math.abs(((p.lonDeg - preferredLon + 540) % 360) - 180);
          const score = dLon + Math.abs(p.latDeg) * 0.15;
          if (score < bestScore) {
            bestScore = score;
            best = p;
          }
        }
        if (!best) {
          continue;
        }
        const ly = sceneYFromLatitudeDeg(best.latDeg, h, camera);
        const baseX = sceneXFromLongitudeDeg(best.lonDeg, w, camera);
        const copies = sceneCameraHorizontalWorldCopyOffsets(camera, w);
        const label = `${contour.altitudeDeg}°`;
        for (const k of copies) {
          const lx = baseX + sceneXShiftForWorldCopy(w, camera, k);
          if (!Number.isFinite(lx) || !Number.isFinite(ly)) {
            continue;
          }
          if (lx < -20 || lx > w + 20) {
            continue;
          }
          const text: RenderTextItem = {
            kind: "text",
            x: lx + 4,
            y: ly - 3,
            text: label,
          fill: strokeRgba(pres.visibilityColor, a(0.78)),
          font: {
            assetId: PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID,
            displayName: "Renderer default",
            sizePx: contourLabelSize,
            weight: 500,
            style: "normal",
          },
          textAlign: "left",
          textBaseline: "bottom",
          stroke: {
            color: `rgba(12, 20, 28, ${a(0.62)})`,
            widthPx: Math.max(1.6, contourLabelSize * 0.24),
            lineJoin: "round",
            miterLimit: 2,
          },
          opacity: op,
          };
          items.push(text);
        }
      }
    }
  }
  }

  const glyphScale = Math.min(9, Math.max(4.6, 5.2 * Math.max(0.7, w / 1400)));
  const placedGlyphs: LabelAvoidDisc[] = [];
  const avoidPaths: LabelPathPolyline[] = [];
  if (geom && pres.planeEnabled && geom.plane.length >= 2) {
    avoidPaths.push(...screenPolylines(geom.plane, w, h, camera));
  }
  if (geom && pres.bandEnabled && geom.northEdge.length >= 2) {
    avoidPaths.push(...screenPolylines(geom.northEdge, w, h, camera));
    avoidPaths.push(...screenPolylines(geom.southEdge, w, h, camera));
  }
  const visForAvoid = options.payload.visibility;
  if (pres.visibilityContoursEnabled && visForAvoid) {
    for (const contour of visForAvoid.contours) {
      if (contour.points.length >= 2) {
        avoidPaths.push(
          ...screenPolylines(
            contour.points.map((p) => ({
              latDeg: p.latDeg,
              lonDeg: p.lonDeg,
              night: true,
              lDeg: 0,
            })),
            w,
            h,
            camera,
          ),
        );
      }
    }
  }

  const footprintRingsToDraw = options.payload.viewingFootprintRings;
  if (pres.viewingEventsEnabled && pres.showViewingFootprint && footprintRingsToDraw) {
    const fpWidth = Math.max(
      1.6,
      astronomyPathStrokeWidthPx(veil, pres.viewingFootprintThickness) * 1.15,
    );
    const fpAlpha = (_p0: MilkyWayTaggedPoint, _p1: MilkyWayTaggedPoint) => a(0.82);
    for (const ring of footprintRingsToDraw) {
      if (ring.length < 2) {
        continue;
      }
      const pts: MilkyWayTaggedPoint[] = ring.map((p) => ({
        latDeg: p.latDeg,
        lonDeg: p.lonDeg,
        night: true,
        lDeg: 0,
      }));
      pushSeamAwarePolyline(items, pts, w, h, camera, pres.viewingFootprintColor, fpWidth, fpAlpha);
      if (pts.length >= 2) {
        avoidPaths.push(...screenPolylines(pts, w, h, camera));
      }
    }
  }

  const drawGlyph = (
    point: MilkyWayTaggedPoint,
    kind: "center" | "anticenter",
    colorCss: string,
  ): { x: number; y: number; r: number } | null => {
    const gy = sceneYFromLatitudeDeg(point.latDeg, h, camera);
    const baseX = sceneXFromLongitudeDeg(point.lonDeg, w, camera);
    const copies = sceneCameraHorizontalWorldCopyOffsets(camera, w);
    const scale = kind === "center" ? glyphScale : glyphScale * 0.72;
    let first: { x: number; y: number; r: number } | null = null;
    for (const k of copies) {
      const gx = baseX + sceneXShiftForWorldCopy(w, camera, k);
      if (!Number.isFinite(gx) || !Number.isFinite(gy)) {
        continue;
      }
      if (gx < -scale * 4 || gx > w + scale * 4) {
        continue;
      }
      const pathDescriptor =
        kind === "center"
          ? galacticCenterGlyphPathDescriptor(gx, gy, scale)
          : galacticAnticenterGlyphPathDescriptor(gx, gy, scale);
      const nightBoost = emphasize ? (point.night ? 0.96 : 0.42) : 0.88;
      items.push(
        createDescriptorPathItem({
          pathDescriptor,
          stroke: strokeRgba(colorCss, a(nightBoost)),
          strokeWidthPx: kind === "center" ? 1.35 : 1.05,
        }),
      );
      placedGlyphs.push({ x: gx, y: gy, radiusPx: scale + 3 });
      if (first === null) {
        first = { x: gx, y: gy, r: scale };
      }
    }
    return first;
  };

  let centerScreen: { x: number; y: number; r: number } | null = null;
  if (geom) {
    if (pres.galacticCenterEnabled && geom.galacticCenter) {
      centerScreen = drawGlyph(geom.galacticCenter, "center", pres.planeColor);
    }
    if (pres.galacticAnticenterEnabled && geom.galacticAnticenter) {
      drawGlyph(geom.galacticAnticenter, "anticenter", pres.bandColor);
    }
  }

  const cityAvoidBoxes: LabelAvoidBox[] = (options.payload.labelAvoidCityLabels ?? []).map((city) =>
    cityPinNameLabelScreenBox({
      pinX: sceneXFromLongitudeDeg(city.lonDeg, w, camera),
      pinY: sceneYFromLatitudeDeg(city.latDeg, h, camera),
      name: city.name,
      viewportWidthPx: w,
    }),
  );

  if (pres.galacticCenterEnabled && pres.galacticCenterLabelEnabled && centerScreen) {
    const labelSize = Math.min(11, Math.max(8, w * 0.012));
    const placed = placeEclipseMapLabel({
      preferredX: centerScreen.x,
      preferredY: centerScreen.y,
      text: GALACTIC_CENTER_LABEL,
      sizePx: labelSize,
      viewportWidthPx: w,
      viewportHeightPx: h,
      avoidDiscs: placedGlyphs,
      avoidPolylines: avoidPaths,
      avoidBoxes: cityAvoidBoxes,
      placement: "lunar-glyph",
    });
    const text: RenderTextItem = {
      kind: "text",
      x: placed.x,
      y: placed.y,
      text: GALACTIC_CENTER_LABEL,
      fill: strokeRgba(pres.planeColor, a(0.94)),
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
    cityAvoidBoxes.push(
      eclipseMapLabelBox(
        placed.x,
        placed.y,
        GALACTIC_CENTER_LABEL,
        labelSize,
        placed.textAlign,
        placed.textBaseline,
      ),
    );
  }

  if (eventLabel && eventLabel.text.trim()) {
    const preferredX = sceneXFromLongitudeDeg(eventLabel.lonDeg, w, camera);
    const preferredY = sceneYFromLatitudeDeg(eventLabel.latDeg, h, camera);
    if (Number.isFinite(preferredX) && Number.isFinite(preferredY)) {
      const avoidDiscs = [...placedGlyphs];
      if (avoidDiscs.length === 0) {
        const r = Math.min(9, Math.max(4.6, 5.2 * Math.max(0.7, w / 1400))) + 3;
        avoidDiscs.push({ x: preferredX, y: preferredY, radiusPx: r });
      }
      const labelSize = Math.min(11, Math.max(8, w * 0.012));
      const placed = placeEclipseMapLabel({
        preferredX,
        preferredY,
        text: eventLabel.text,
        sizePx: labelSize,
        viewportWidthPx: w,
        viewportHeightPx: h,
        avoidDiscs,
        avoidPolylines: avoidPaths,
        avoidBoxes: cityAvoidBoxes,
        placement: "lunar-glyph",
      });
      items.push({
        kind: "text",
        x: placed.x,
        y: placed.y,
        text: eventLabel.text,
        fill: strokeRgba(pres.planeColor, a(0.96)),
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
          color: `rgba(12, 20, 28, ${a(0.72)})`,
          widthPx: Math.max(2, labelSize * 0.28),
          lineJoin: "round",
          miterLimit: 2,
        },
        opacity: op,
      });
    }
  }

  return { items };
}
