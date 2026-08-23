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
 * Dynamic point-features (DLC-2) in equirectangular scene space.
 * Placement and disc radii are resolved here; the canvas executor applies path2d/text only.
 */

import { PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID } from "../../config/productTextFont.ts";
import { IDENTITY_SCENE_CAMERA, sceneXFromLongitudeDeg, sceneYFromLatitudeDeg, type SceneCamera } from "../../core/sceneCamera";
import {
  earthquakeMarkerRadiusPx,
  placeEarthquakeHoverLabel,
} from "../../core/earthquakeMarkerHover";
import type { DynamicPointFeaturesPayload } from "../../layers/dynamicPointFeaturesPayload";
import { effectiveOverlayReadabilityLiftVeil01 } from "../../layers/overlayReadabilityHints";
import type { RenderPath2DItem, RenderPlan, RenderTextItem } from "./renderPlanTypes";
import { circlePath2D } from "./circlePath2D";

export interface DynamicPointFeaturesRenderPlanOptions {
  viewportWidthPx: number;
  viewportHeightPx: number;
  camera?: SceneCamera;
  layerOpacity: number;
  payload: DynamicPointFeaturesPayload;
}

/**
 * Builds a {@link RenderPlan} for dynamic point features: magnitude-scaled discs + optional labels.
 */
export function buildDynamicPointFeaturesRenderPlan(
  options: DynamicPointFeaturesRenderPlanOptions,
): RenderPlan {
  const w = options.viewportWidthPx;
  const h = options.viewportHeightPx;
  if (!(w > 0) || !(h > 0)) {
    return { items: [] };
  }
  const camera = options.camera ?? IDENTITY_SCENE_CAMERA;

  const layerOp = Math.max(0, Math.min(1, options.layerOpacity));
  const liftScale = options.payload.overlayReadabilityLiftScale01;
  const items: RenderPlan["items"] = [];
  const labelSize = Math.min(11, Math.max(8, w * 0.012));

  for (const feature of options.payload.features) {
    const x = sceneXFromLongitudeDeg(feature.lonDeg, w, camera);
    const y = sceneYFromLatitudeDeg(feature.latDeg, h, camera);
    const r = earthquakeMarkerRadiusPx(feature.magnitude, w);

    const v = effectiveOverlayReadabilityLiftVeil01(
      feature.readabilityNightVeil01,
      liftScale,
    );
    const sw = (base: number) => Math.max(base, base * (1 + 0.55 * v));
    const a = (alpha: number) =>
      Math.min(1, alpha * layerOp * (1 + 0.18 * v));

    const inner: RenderPath2DItem = {
      kind: "path2d",
      pathKind: "path2d",
      path: circlePath2D(x, y, r),
      fill: `rgba(255, 120, 72, ${a(0.88)})`,
      stroke: `rgba(40, 18, 12, ${a(0.65)})`,
      strokeWidthPx: sw(1.1),
    };
    items.push(inner);

    items.push({
      kind: "path2d",
      pathKind: "path2d",
      path: circlePath2D(x, y, r + 1.6),
      stroke: `rgba(255, 230, 200, ${a(0.4)})`,
      strokeWidthPx: sw(1),
    });

    const persistentLabel =
      feature.label !== undefined && feature.label.trim() !== ""
        ? feature.label
        : undefined;
    if (persistentLabel !== undefined) {
      const text: RenderTextItem = {
        kind: "text",
        x: x + r + 4,
        y: y - labelSize * 0.35,
        text: persistentLabel,
        fill: `rgba(255, 236, 220, ${a(0.92)})`,
        font: {
          assetId: PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID,
          displayName: "Renderer default",
          sizePx: labelSize,
          weight: 500,
          style: "normal",
        },
        textAlign: "left",
        textBaseline: "top",
        stroke: {
          color: `rgba(20, 12, 8, ${a(0.7)})`,
          widthPx: sw(Math.max(2, labelSize * 0.28)),
          lineJoin: "round",
          miterLimit: 2,
        },
        opacity: layerOp,
      };
      items.push(text);
      continue;
    }

    const hoverText =
      feature.hoverLabel !== undefined && feature.hoverLabel.trim() !== ""
        ? feature.hoverLabel
        : undefined;
    if (hoverText !== undefined) {
      const placed = placeEarthquakeHoverLabel({
        originX: x,
        originY: y,
        radiusPx: r,
        text: hoverText,
        sizePx: labelSize,
        viewportWidthPx: w,
        viewportHeightPx: h,
      });
      const text: RenderTextItem = {
        kind: "text",
        x: placed.x,
        y: placed.y,
        text: hoverText,
        fill: `rgba(255, 236, 220, ${a(0.98)})`,
        font: {
          assetId: PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID,
          displayName: "Renderer default",
          sizePx: labelSize,
          weight: 600,
          style: "normal",
        },
        textAlign: placed.textAlign,
        textBaseline: placed.textBaseline,
        stroke: {
          color: `rgba(20, 12, 8, ${a(0.78)})`,
          widthPx: sw(Math.max(2, labelSize * 0.3)),
          lineJoin: "round",
          miterLimit: 2,
        },
        opacity: layerOp,
      };
      items.push(text);
    }
  }

  return { items };
}
