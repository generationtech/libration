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
 * Backend-neutral render plan: ordered primitive draws with plain style data only; no scene graph.
 *
 * **Non-text primitives** (intent → Canvas realization):
 * - **rect** — axis-aligned fill and/or stroke (CSS color strings, px widths).
 * - **line** — segment stroke ({@link RenderColor}, width px, optional {@link RenderLineCap}).
 * - **path2d** — filled/stroked path. Payload is a discriminated union: either a Canvas {@link Path2D}
 *   bridge (`pathKind: "path2d"`) or backend-neutral {@link RenderPathDescriptor} (`pathKind: "descriptor"`).
 *   Prefer descriptors for shared geometry intent; the Canvas bridge materializes {@link Path2D} when needed.
 *   Optional {@link RenderPath2DItem.clip} is a {@link RenderClipPayload} (legacy {@link Path2D} or
 *   {@link RenderPathDescriptor}); Canvas: {@link ../canvas/canvasPathBridge.ts}.
 * - **linearGradientRect** / **radialGradientFill** — gradient specs with plain stops (no gradient object in
 *   plan data). Canvas: {@link ../canvas/canvasPaintBridge.ts}.
 * - **rasterPatch** — generated RGBA8 buffer upscaled to a destination rect.
 * - **imageBlit** — URL-backed decoded image stretched to a destination rect.
 *
 * Text pipeline (semantic → plan → backend):
 * TypographyRole → ResolvedTextStyle → TextGlyph → RenderPlan text item → backend font realization
 * (Canvas: {@link ../canvas/canvasTextFontBridge.ts} builds `CanvasRenderingContext2D.font`).
 */

import type { FontAssetId } from "../../typography/fontAssetTypes.ts";
import type { RenderPathDescriptor } from "./pathTypes.ts";

/** CSS/sRGB color string for fills and strokes (backend interprets; typically same as Canvas/CSS). */
export type RenderColor = string;

/** Line caps for stroked segments — aligned with common 2D APIs (Canvas/SVG/cairo-style naming). */
export type RenderLineCap = "butt" | "round" | "square";

/** Line joins for stroked paths — aligned with common 2D APIs. */
export type RenderLineJoin = "bevel" | "miter" | "round";

/** One stop in a linear or radial gradient (offset typically 0…1). */
export interface RenderGradientStop {
  offset: number;
  color: RenderColor;
}

export type RenderTextAlign = CanvasTextAlign;

export type RenderTextBaseline = CanvasTextBaseline;

/**
 * Sentinel {@link FontAssetId} for plans that intentionally use a generic browser system stack
 * (scene overlays, pins). Pair with {@link RenderFontStyle.family} for Canvas/CSS until a manifest
 * asset is assigned.
 */
export const RENDER_PLAN_SYSTEM_UI_STACK_ASSET_ID: FontAssetId = "__systemUiStack";

/** Font payload on text primitives — backend-neutral identity plus nominal metrics. */
export interface RenderFontStyle {
  /** Stable manifest id or {@link RENDER_PLAN_SYSTEM_UI_STACK_ASSET_ID}; primary font identity for planners. */
  assetId: FontAssetId;
  /** Manifest or planner label — inspection and optional CSS-family derivation on Canvas. */
  displayName: string;
  /**
   * Transitional Canvas/CSS `font-family` stack when the plan carries an explicit web stack
   * (e.g. scene overlay). Omit for manifest-backed faces so the Canvas bridge builds from {@link displayName}.
   */
  family?: string;
  sizePx: number;
  /** Numeric weight or CSS keyword (`normal`, `bold`) as consumed by Canvas `font`. */
  weight: number | string;
  style?: "normal" | "italic";
  lineHeightPx?: number;
}

/** Alias matching multi-renderer naming; same shape as {@link RenderFontStyle}. */
export type RenderTextFont = RenderFontStyle;

/** Plain shadow for text — executor applies to canvas; no CanvasGradient. */
export interface RenderTextShadowStyle {
  color: RenderColor;
  blurPx: number;
  offsetXPx: number;
  offsetYPx: number;
}

/** Optional outline drawn before fill (e.g. map pin labels). Canvas realizes via `strokeText`. */
export interface RenderTextStrokeStyle {
  color: RenderColor;
  widthPx: number;
  lineJoin?: RenderLineJoin;
  miterLimit?: number;
}

export interface RenderTextItem {
  kind: "text";
  x: number;
  y: number;
  text: string;
  fill: RenderColor;
  font: RenderFontStyle;
  textAlign: RenderTextAlign;
  textBaseline: RenderTextBaseline;
  /** When set, passed to canvas as `${value}em`. */
  letterSpacingEm?: number;
  shadow?: RenderTextShadowStyle;
  /** Drawn before fill when set; no shadow applied to stroke. */
  stroke?: RenderTextStrokeStyle;
  /** Multiplies globalAlpha for this draw (default 1). */
  opacity?: number;
}

/**
 * Text laid out along a circular arc (center {@link cx}, {@link cy}; radius {@link radiusPx}).
 * Each glyph is placed at an angle linearly interpolated from {@link startAngleRad} to {@link endAngleRad} (radians).
 */
export interface RenderCurvedTextItem {
  kind: "curvedText";
  text: string;
  cx: number;
  cy: number;
  radiusPx: number;
  startAngleRad: number;
  endAngleRad: number;
  fill: RenderColor;
  font: RenderFontStyle;
  /** When set, passed to canvas as `${value}em`. */
  letterSpacingEm?: number;
}

export interface RenderRectItem {
  kind: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: RenderColor;
  stroke?: RenderColor;
  strokeWidthPx?: number;
}

export interface RenderLineItem {
  kind: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: RenderColor;
  strokeWidthPx: number;
  lineCap?: RenderLineCap;
}

/**
 * Exactly one path payload: Canvas {@link Path2D} or backend-neutral {@link RenderPathDescriptor}.
 * Use {@link ./pathItemFactories.ts} helpers to construct items without mixing fields.
 */
export type RenderPathPayload =
  | { pathKind: "path2d"; path: Path2D }
  | { pathKind: "descriptor"; pathDescriptor: RenderPathDescriptor };

/**
 * Clip region for path2d items — mirrors {@link RenderPathPayload}: transitional Canvas {@link Path2D} or
 * descriptor intent. Prefer descriptor for new/migrated emitters; the Canvas bridge materializes {@link Path2D}.
 */
export type RenderClipPayload =
  | { clipPathKind: "path2d"; clipPath: Path2D }
  | { clipPathKind: "descriptor"; clipPathDescriptor: RenderPathDescriptor };

/**
 * Filled and/or stroked vector path. {@link RenderPathPayload} guarantees a valid geometry payload.
 * {@link clip}, when set, is applied before fill/stroke (Canvas realization only).
 */
export type RenderPath2DItem = {
  kind: "path2d";
  fill?: RenderColor;
  stroke?: RenderColor;
  strokeWidthPx?: number;
  clip?: RenderClipPayload;
} & RenderPathPayload;

/**
 * Axis-aligned rect filled with a linear gradient. Endpoints (x1,y1)→(x2,y2) are in scene pixels;
 * {@link stops} use normalized offset and CSS color strings — no backend gradient object in the plan.
 */
export interface RenderLinearGradientRectItem {
  kind: "linearGradientRect";
  x: number;
  y: number;
  width: number;
  height: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stops: readonly RenderGradientStop[];
}

/**
 * Radial gradient from (x0,y0,r0) to (x1,y1,r1) in scene pixels, then clipped to a circle before fill.
 */
export interface RenderRadialGradientFillItem {
  kind: "radialGradientFill";
  x0: number;
  y0: number;
  r0: number;
  x1: number;
  y1: number;
  r1: number;
  stops: readonly RenderGradientStop[];
  clipCx: number;
  clipCy: number;
  clipR: number;
}

/**
 * Axis-aligned RGBA8 image drawn into the scene: source pixels are upscaled to {@link destWidth} × {@link destHeight}
 * with image smoothing (same contract as prior canvas illumination pass). Plain buffer only — no texture handles.
 *
 * Distinct from {@link RenderImageBlitItem}: rasterPatch is for generated/sample-buffer output (e.g. illumination),
 * not for URL-backed static map assets.
 */
export interface RenderRasterPatchItem {
  kind: "rasterPatch";
  x: number;
  y: number;
  destWidth: number;
  destHeight: number;
  widthPx: number;
  heightPx: number;
  rgba: Uint8ClampedArray;
}

/**
 * Stretch a decoded image (identified by URL string) into an axis-aligned destination rectangle.
 * Image load/cache/decode is not represented here — the executor resolves {@link src} via a backend hook.
 */
export interface RenderImageBlitItem {
  kind: "imageBlit";
  /** Resolved image reference (e.g. same string passed to HTMLImageElement.src). */
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /**
   * Canvas `filter` string (CSS filter syntax), when set. Encoded upstream from
   * scene `baseMap` presentation; the executor applies it and restores state.
   */
  cssFilter?: string;
}

export type RenderPlanItem =
  | RenderTextItem
  | RenderCurvedTextItem
  | RenderRectItem
  | RenderLineItem
  | RenderPath2DItem
  | RenderLinearGradientRectItem
  | RenderRadialGradientFillItem
  | RenderRasterPatchItem
  | RenderImageBlitItem;

export interface RenderPlan {
  /** Drawn in array order (painter's algorithm). */
  items: RenderPlanItem[];
}
