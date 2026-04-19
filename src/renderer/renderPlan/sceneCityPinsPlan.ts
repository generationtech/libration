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
 * Reference/custom city pins in equirectangular scene space: placement, radii, typography,
 * label mode, and draw order are resolved here; {@link executeRenderPlanOnCanvas} applies
 * path2d and text items only.
 */

import { mapXFromLongitudeDeg } from "../../core/equirectangularProjection";
import { PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID } from "../../config/productTextFont.ts";
import type { CityPinsPayload } from "../../layers/cityPinsPayload";
import { defaultFontAssetRegistry } from "../../typography/fontAssetRegistry";
import type { RenderPath2DItem, RenderPlan, RenderTextItem } from "./renderPlanTypes";
import { circlePath2D } from "./circlePath2D";

function mapLatToY(latDeg: number, viewportHeightPx: number): number {
  return ((90 - latDeg) / 180) * viewportHeightPx;
}

export interface CityPinsRenderPlanOptions {
  viewportWidthPx: number;
  viewportHeightPx: number;
  layerOpacity: number;
  payload: CityPinsPayload;
}

/**
 * Builds a {@link RenderPlan} for the city-pins layer: one inner filled+stroked disc,
 * outer halo stroke, then optional stroked+filled labels (name, optional local time).
 */
export function buildCityPinsRenderPlan(options: CityPinsRenderPlanOptions): RenderPlan {
  const w = options.viewportWidthPx;
  const h = options.viewportHeightPx;
  if (!(w > 0) || !(h > 0)) {
    return { items: [] };
  }

  const layerOp = options.layerOpacity;
  const { showLabels, labelMode, scale, cities, cityNameFontAssetId, dateTimeFontAssetId } =
    options.payload;
  const cityNameDisplayName =
    cityNameFontAssetId === PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID
      ? "Renderer default"
      : defaultFontAssetRegistry.requireById(cityNameFontAssetId).displayName;
  const dateTimeDisplayName =
    dateTimeFontAssetId === PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID
      ? "Renderer default"
      : defaultFontAssetRegistry.requireById(dateTimeFontAssetId).displayName;
  const scaleFactor =
    scale === "small" ? 0.82 : scale === "large" ? 1.22 : 1;

  const nameSize =
    scaleFactor * Math.min(13, Math.max(10, w * 0.016));
  const timeSize =
    scaleFactor * Math.min(11, Math.max(9, nameSize * 0.88));
  const lineGap = Math.max(1, nameSize * 0.12);

  const items: RenderPlan["items"] = [];

  for (const city of cities) {
    const x = mapXFromLongitudeDeg(city.lonDeg, w);
    const y = mapLatToY(city.latDeg, h);
    const r =
      scaleFactor * Math.min(4, Math.max(2.5, w * 0.0028));

    const inner: RenderPath2DItem = {
      kind: "path2d",
      pathKind: "path2d",
      path: circlePath2D(x, y, r),
      fill: "rgba(165, 205, 255, 0.92)",
      stroke: "rgba(18, 28, 48, 0.55)",
      strokeWidthPx: 1,
    };
    items.push(inner);

    items.push({
      kind: "path2d",
      pathKind: "path2d",
      path: circlePath2D(x, y, r + 1.5),
      stroke: "rgba(255, 255, 255, 0.35)",
      strokeWidthPx: 1,
    });

    if (!showLabels) {
      continue;
    }

    const showTimeLine =
      labelMode === "cityAndTime" && city.localTimeLabel.length > 0;
    const lx = x + r + 7 * scaleFactor;
    const blockH = showTimeLine ? nameSize + lineGap + timeSize : nameSize;
    let textY = y - blockH / 2;

    const nameStrokeW = Math.max(2.5, nameSize * 0.28);
    const nameText: RenderTextItem = {
      kind: "text",
      x: lx,
      y: textY,
      text: city.name,
      fill: "rgba(245, 248, 255, 0.94)",
      font: {
        assetId: cityNameFontAssetId,
        displayName: cityNameDisplayName,
        sizePx: nameSize,
        weight: 500,
        style: "normal",
      },
      textAlign: "left",
      textBaseline: "top",
      stroke: {
        color: "rgba(8, 14, 28, 0.88)",
        widthPx: nameStrokeW,
        lineJoin: "round",
        miterLimit: 2,
      },
      opacity: layerOp,
    };
    items.push(nameText);

    if (showTimeLine) {
      textY += nameSize + lineGap;
      const tw = Math.max(2, timeSize * 0.28);
      items.push({
        kind: "text",
        x: lx,
        y: textY,
        text: city.localTimeLabel,
        fill: "rgba(215, 224, 242, 0.9)",
        font: {
          assetId: dateTimeFontAssetId,
          displayName: dateTimeDisplayName,
          sizePx: timeSize,
          weight: 400,
          style: "normal",
        },
        textAlign: "left",
        textBaseline: "top",
        stroke: {
          color: "rgba(6, 12, 22, 0.9)",
          widthPx: tw,
          lineJoin: "round",
          miterLimit: 2,
        },
        opacity: layerOp,
      });
    }
  }

  return { items };
}
