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

import {
  IDENTITY_SCENE_CAMERA,
  sceneCameraHorizontalWorldCopyOffsets,
  sceneCameraVectorWrapSlopPx,
  sceneXFromLongitudeDeg,
  sceneXShiftForWorldCopy,
  sceneYFromLatitudeDeg,
  type SceneCamera,
} from "../../core/sceneCamera";
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
  camera?: SceneCamera;
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

function emitPointMarkerCopies(
  items: RenderPlan["items"],
  marker: EquirectRegionPointMarker,
  viewportWidthPx: number,
  viewportHeightPx: number,
  opacity: number,
  camera: SceneCamera,
): void {
  const scale = Number.isFinite(marker.radiusScale) ? Math.max(0.2, marker.radiusScale) : 1;
  const r = equirectPointMarkerBaseRadiusPx(viewportWidthPx) * scale;
  const haloR = r * 1.55;
  const underW = Math.max(2.4, r * 0.42);
  const strokeW = Math.max(1.15, r * 0.2);
  const cy = sceneYFromLatitudeDeg(marker.latDeg, viewportHeightPx, camera);
  const slop = r + 4;
  const copies = sceneCameraHorizontalWorldCopyOffsets(
    camera,
    viewportWidthPx,
    sceneCameraVectorWrapSlopPx(viewportWidthPx),
  );
  const baseX = sceneXFromLongitudeDeg(marker.lonDeg, viewportWidthPx, camera);
  for (const k of copies) {
    const cx = baseX + sceneXShiftForWorldCopy(viewportWidthPx, camera, k);
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
  const camera = options.camera ?? IDENTITY_SCENE_CAMERA;
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
          camera,
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
        for (const pathDescriptor of equirectPolylineToPathDescriptors(stroke.points, w, h, camera)) {
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
    emitPointMarkerCopies(items, marker, w, h, op, camera);
  }
  const labels = options.payload.labels ?? [];
  if (labels.length > 0) {
    const sizePx = Math.min(15, Math.max(11, w * 0.011));
  const copies = sceneCameraHorizontalWorldCopyOffsets(camera, w);
    const avoidDiscs = (options.payload.labelAvoidDiscs ?? []).flatMap((disc) => {
      const y = sceneYFromLatitudeDeg(disc.latDeg, h, camera);
      const baseX = sceneXFromLongitudeDeg(disc.lonDeg, w, camera);
      const radiusPx = avoidHaloRadiusPx(w, disc.haloMultiplier);
      return copies.map((k) => ({
        x: baseX + sceneXShiftForWorldCopy(w, camera, k),
        y,
        radiusPx,
      }));
    });
    for (const marker of options.payload.pointMarkers ?? []) {
      const r = equirectPointMarkerBaseRadiusPx(w) * marker.radiusScale;
      avoidDiscs.push({
        x: sceneXFromLongitudeDeg(marker.lonDeg, w, camera),
        y: sceneYFromLatitudeDeg(marker.latDeg, h, camera),
        radiusPx: r + 8,
      });
    }
    const avoidPolylines = (options.payload.labelPathHints ?? []).map((hint) => ({
      points: hint.points.map((p) => ({
        x: sceneXFromLongitudeDeg(p.lonDeg, w, camera),
        y: sceneYFromLatitudeDeg(p.latDeg, h, camera),
      })),
    }));
    const avoidBoxes = (options.payload.labelAvoidCityLabels ?? []).map((city) =>
      cityPinNameLabelScreenBox({
        pinX: sceneXFromLongitudeDeg(city.lonDeg, w, camera),
        pinY: sceneYFromLatitudeDeg(city.latDeg, h, camera),
        name: city.name,
        viewportWidthPx: w,
      }),
    );
    for (const label of labels) {
      if (!label.text.trim()) {
        continue;
      }
      const copies = sceneCameraHorizontalWorldCopyOffsets(camera, w);
      const baseX = sceneXFromLongitudeDeg(label.lonDeg, w, camera);
      const preferredY = sceneYFromLatitudeDeg(label.latDeg, h, camera);
      let preferredX = baseX;
      let best = Number.POSITIVE_INFINITY;
      for (const k of copies) {
        const x = baseX + sceneXShiftForWorldCopy(w, camera, k);
        if (x < -sizePx || x > w + sizePx) {
          continue;
        }
        const dist = Math.abs(x - w * 0.5);
        if (dist < best) {
          best = dist;
          preferredX = x;
        }
      }
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
