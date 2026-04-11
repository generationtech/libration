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
 * Render-plan builder: bounded corner time readouts (UTC / local) in scene/map space.
 * Placement, typography, colors, and shadow match legacy {@link CanvasRenderBackend} text overlay;
 * {@link executeRenderPlanOnCanvas} applies text items only.
 */

import type { TextOverlayPlacement } from "../../layers/textOverlayPayload";
import {
  RENDER_PLAN_SYSTEM_UI_STACK_ASSET_ID,
  type RenderPlan,
  type RenderTextItem,
} from "./renderPlanTypes";

const FONT_STACK = "system-ui, -apple-system, Segoe UI, sans-serif";
const SYSTEM_UI_DISPLAY_NAME = "System UI stack";

const TEXT_SHADOW: NonNullable<RenderTextItem["shadow"]> = {
  color: "rgba(0, 8, 24, 0.75)",
  blurPx: 6,
  offsetXPx: 0,
  offsetYPx: 1,
};

export interface SceneTextOverlayPlanOptions {
  viewportWidthPx: number;
  /** Same factor as scene layer compositing (baked into each item for executor alpha handling). */
  layerOpacity: number;
  placement: TextOverlayPlacement;
  /** Smaller caption (e.g. "UTC", "LOCAL") — uppercased in the plan. */
  label: string;
  /** Main line (e.g. time string). */
  primary: string;
}

/**
 * Resolves padding, responsive font sizes, alignment, and draw order for the scene text overlay slice.
 * Per-item opacity matches layer opacity so {@link executeRenderPlanOnCanvas} text draws compose
 * correctly with the scene layer stack (executor resets globalAlpha per item).
 */
export function buildSceneTextOverlayRenderPlan(
  options: SceneTextOverlayPlanOptions,
): RenderPlan {
  const vw = options.viewportWidthPx;
  if (vw <= 0) {
    return { items: [] };
  }

  const layerOp = options.layerOpacity;
  const pad = Math.min(28, vw * 0.04);
  const sizeUtc = Math.min(34, Math.max(20, vw * 0.042));
  const sizeLocal = Math.min(28, Math.max(17, vw * 0.036));
  const labelText = options.label.toUpperCase();

  const items: RenderPlan["items"] = [];

  if (options.placement === "top-left") {
    items.push(
      {
        kind: "text",
        x: pad,
        y: pad,
        text: labelText,
        fill: "rgba(230, 238, 255, 0.82)",
        font: {
          assetId: RENDER_PLAN_SYSTEM_UI_STACK_ASSET_ID,
          displayName: SYSTEM_UI_DISPLAY_NAME,
          family: FONT_STACK,
          sizePx: 13,
          weight: 500,
          style: "normal",
        },
        textAlign: "left",
        textBaseline: "top",
        shadow: TEXT_SHADOW,
        opacity: layerOp,
      },
      {
        kind: "text",
        x: pad,
        y: pad + 20,
        text: options.primary,
        fill: "rgba(248, 252, 255, 0.95)",
        font: {
          assetId: RENDER_PLAN_SYSTEM_UI_STACK_ASSET_ID,
          displayName: SYSTEM_UI_DISPLAY_NAME,
          family: FONT_STACK,
          sizePx: sizeUtc,
          weight: 600,
          style: "normal",
        },
        textAlign: "left",
        textBaseline: "top",
        shadow: TEXT_SHADOW,
        opacity: layerOp,
      },
    );
  } else {
    const x = vw - pad;
    items.push(
      {
        kind: "text",
        x,
        y: pad,
        text: labelText,
        fill: "rgba(230, 238, 255, 0.82)",
        font: {
          assetId: RENDER_PLAN_SYSTEM_UI_STACK_ASSET_ID,
          displayName: SYSTEM_UI_DISPLAY_NAME,
          family: FONT_STACK,
          sizePx: 13,
          weight: 500,
          style: "normal",
        },
        textAlign: "right",
        textBaseline: "top",
        shadow: TEXT_SHADOW,
        opacity: layerOp,
      },
      {
        kind: "text",
        x,
        y: pad + 20,
        text: options.primary,
        fill: "rgba(248, 252, 255, 0.95)",
        font: {
          assetId: RENDER_PLAN_SYSTEM_UI_STACK_ASSET_ID,
          displayName: SYSTEM_UI_DISPLAY_NAME,
          family: FONT_STACK,
          sizePx: sizeLocal,
          weight: 500,
          style: "normal",
        },
        textAlign: "right",
        textBaseline: "top",
        shadow: TEXT_SHADOW,
        opacity: layerOp,
      },
    );
  }

  return { items };
}
