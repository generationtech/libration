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

import { mapXFromLongitudeDeg } from "../../core/equirectangularProjection";
import { placeEclipseMapLabel } from "../../core/eclipse/eclipseMapLabelPlacement";
import { cityPinNameLabelScreenBox } from "../../layers/cityPinsPayload";
import { sublunarMarkerRadiusPx } from "../../core/sublunarMarkerAppearance";
import { effectiveOverlayReadabilityLiftVeil01 } from "../../layers/overlayReadabilityHints";
import {
  equirectPointMarkerBaseRadiusPx,
  type EquirectRegionOverlayPayload,
  type EquirectRegionPointMarker,
} from "../../layers/equirectRegionPayload";
import { circlePathDescriptor } from "./circlePath2D";
import { createDescriptorPathItem } from "./pathItemFactories";
import {
  RENDER_PLAN_SYSTEM_UI_STACK_ASSET_ID,
  type RenderPlan,
  type RenderTextItem,
} from "./renderPlanTypes";
import { equirectPolylineToPathDescriptors, equirectRingToPathDescriptors } from "./equirectSeamRegion";

const LABEL_FONT_STACK = "system-ui, -apple-system, Segoe UI, sans-serif";

export interface EquirectRegionOverlayPlanOptions {
  viewportWidthPx: number;
  viewportHeightPx: number;
  layerOpacity: number;
  payload: EquirectRegionOverlayPayload;
}

function scaleRgba(css: string, opacity: number): string {
  const m = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)$/.exec(css);
  if (!m) {
    return css;
  }
  const a = Number(m[4]) * opacity;
  return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${Math.max(0, Math.min(1, a)).toFixed(4)})`;
}

function avoidHaloRadiusPx(viewportWidthPx: number, haloMultiplier: number): number {
  const moon = sublunarMarkerRadiusPx(viewportWidthPx, "extraLarge");
  const sun = Math.min(9, Math.max(4.5, viewportWidthPx * 0.0055));
  return Math.max(moon, sun) * Math.max(1, haloMultiplier);
}

const WORLD_COPIES_DEG = [-360, 0, 360] as const;

function emitPointMarkerCopies(
  items: RenderPlan["items"],
  marker: EquirectRegionPointMarker,
  viewportWidthPx: number,
  viewportHeightPx: number,
  opacity: number,
): void {
  const scale = Number.isFinite(marker.radiusScale) ? Math.max(0.2, marker.radiusScale) : 1;
  const r = equirectPointMarkerBaseRadiusPx(viewportWidthPx) * scale;
  const haloR = r * 1.55;
  const underW = Math.max(2.4, r * 0.42);
  const strokeW = Math.max(1.15, r * 0.2);
  const cy = ((90 - marker.latDeg) / 180) * viewportHeightPx;
  const slop = r + 4;
  for (const offset of WORLD_COPIES_DEG) {
    const cx = mapXFromLongitudeDeg(marker.lonDeg + offset, viewportWidthPx);
    if (cx + slop < 0 || cx - slop > viewportWidthPx) {
      continue;
    }
    if (marker.haloFill) {
      items.push(
        createDescriptorPathItem({
          pathDescriptor: circlePathDescriptor(cx, cy, haloR),
          fill: scaleRgba(marker.haloFill, opacity),
        }),
      );
    }
    items.push(
      createDescriptorPathItem({
        pathDescriptor: circlePathDescriptor(cx, cy, r + underW * 0.22),
        stroke: scaleRgba(marker.underStroke, Math.min(1, opacity + 0.06)),
        strokeWidthPx: underW,
      }),
    );
    items.push(
      createDescriptorPathItem({
        pathDescriptor: circlePathDescriptor(cx, cy, r),
        fill: scaleRgba(marker.fill, opacity),
        stroke: scaleRgba(marker.stroke, Math.min(1, opacity + 0.04)),
        strokeWidthPx: strokeW,
      }),
    );
  }
}

export function buildEquirectRegionOverlayRenderPlan(
  options: EquirectRegionOverlayPlanOptions,
): RenderPlan {
  const w = options.viewportWidthPx;
  const h = options.viewportHeightPx;
  if (w <= 0 || h <= 0) {
    return { items: [] };
  }
  const veil = effectiveOverlayReadabilityLiftVeil01(
    options.payload.readability?.nightVeil01,
    options.payload.readability?.overlayReadabilityLiftScale01,
  );
  const op = options.layerOpacity * (0.82 + 0.18 * veil);
  const items: RenderPlan["items"] = [];
  type PendingOp = { readonly order: number; readonly seq: number; readonly emit: () => void };
  const pending: PendingOp[] = [];
  options.payload.fills.forEach((fill, seq) => {
    pending.push({
      order: fill.drawOrder ?? 0,
      seq,
      emit: () => {
        const color = scaleRgba(fill.fill, op);
        for (const pathDescriptor of equirectRingToPathDescriptors(fill.ring, w, h, {
          polarCloseLatDeg: fill.polarCloseLatDeg,
        })) {
          items.push(createDescriptorPathItem({ pathDescriptor, fill: color }));
        }
      },
    });
  });
  options.payload.strokes.forEach((stroke, seq) => {
    pending.push({
      order: stroke.drawOrder ?? 100,
      seq: 1000 + seq,
      emit: () => {
        const color = scaleRgba(stroke.stroke, Math.min(1, op + 0.08));
        const width = stroke.strokeWidthPx * (1 + 0.25 * veil);
        for (const pathDescriptor of equirectPolylineToPathDescriptors(stroke.points, w, h)) {
          items.push(
            createDescriptorPathItem({
              pathDescriptor,
              stroke: color,
              strokeWidthPx: width,
            }),
          );
        }
      },
    });
  });
  pending.sort((a, b) => a.order - b.order || a.seq - b.seq);
  for (const op of pending) {
    op.emit();
  }
  for (const marker of options.payload.pointMarkers ?? []) {
    emitPointMarkerCopies(items, marker, w, h, op);
  }
  const labels = options.payload.labels ?? [];
  if (labels.length > 0) {
    const sizePx = Math.min(15, Math.max(11, w * 0.011));
    const avoidDiscs = (options.payload.labelAvoidDiscs ?? []).map((disc) => ({
      x: mapXFromLongitudeDeg(disc.lonDeg, w),
      y: ((90 - disc.latDeg) / 180) * h,
      radiusPx: avoidHaloRadiusPx(w, disc.haloMultiplier),
    }));
    for (const marker of options.payload.pointMarkers ?? []) {
      const r = equirectPointMarkerBaseRadiusPx(w) * marker.radiusScale;
      avoidDiscs.push({
        x: mapXFromLongitudeDeg(marker.lonDeg, w),
        y: ((90 - marker.latDeg) / 180) * h,
        radiusPx: r + 8,
      });
    }
    const avoidPolylines = (options.payload.labelPathHints ?? []).map((hint) => ({
      points: hint.points.map((p) => ({
        x: mapXFromLongitudeDeg(p.lonDeg, w),
        y: ((90 - p.latDeg) / 180) * h,
      })),
    }));
    const avoidBoxes = (options.payload.labelAvoidCityLabels ?? []).map((city) =>
      cityPinNameLabelScreenBox({
        pinX: mapXFromLongitudeDeg(city.lonDeg, w),
        pinY: ((90 - city.latDeg) / 180) * h,
        name: city.name,
        viewportWidthPx: w,
      }),
    );
    for (const label of labels) {
      if (!label.text.trim()) {
        continue;
      }
      const preferredX = mapXFromLongitudeDeg(label.lonDeg, w);
      const preferredY = ((90 - label.latDeg) / 180) * h;
      const lunar = label.placement === "lunar-glyph";
      const placed =
        avoidDiscs.length > 0 || avoidPolylines.length > 0 || avoidBoxes.length > 0 || lunar
          ? placeEclipseMapLabel({
              preferredX,
              preferredY,
              text: label.text,
              sizePx,
              viewportWidthPx: w,
              viewportHeightPx: h,
              avoidDiscs,
              avoidPolylines,
              avoidBoxes,
              placement: lunar ? "lunar-glyph" : "solar-path",
            })
          : { x: preferredX, y: preferredY, textAlign: "center" as const, textBaseline: "middle" as const };
      const fill = label.fill ?? "rgba(245, 248, 255, 0.92)";
      const text: RenderTextItem = {
        kind: "text",
        x: placed.x,
        y: placed.y,
        text: label.text,
        fill: scaleRgba(fill, op),
        font: {
          assetId: RENDER_PLAN_SYSTEM_UI_STACK_ASSET_ID,
          displayName: "System UI stack",
          family: LABEL_FONT_STACK,
          sizePx,
          weight: 500,
          style: "normal",
        },
        textAlign: placed.textAlign,
        textBaseline: placed.textBaseline,
        stroke: {
          color: `rgba(8, 14, 28, ${Math.min(1, op * 0.88).toFixed(4)})`,
          widthPx: Math.max(2.2, sizePx * 0.26),
          lineJoin: "round",
          miterLimit: 2,
        },
        opacity: options.layerOpacity,
      };
      items.push(text);
    }
  }
  return { items };
}
