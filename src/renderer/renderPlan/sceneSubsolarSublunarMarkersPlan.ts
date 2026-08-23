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
 * Bounded subsolar / sub-lunar equirectangular markers: layout, gradients, rays, and phase shading are resolved here;
 * {@link executeRenderPlanOnCanvas} applies radialGradientFill / path2d / line items only.
 */

import { IDENTITY_SCENE_CAMERA, sceneCameraHorizontalWorldCopyOffsets, sceneXFromLongitudeDeg, sceneXShiftForWorldCopy, sceneYFromLatitudeDeg, type SceneCamera } from "../../core/sceneCamera";
import {
  EARTH_FIXED_SCENE_REFERENCE_FRAME,
  type SceneReferenceFrame,
} from "../../core/sceneReferenceFrame";
import {
  type OverlayReadabilityHints,
  effectiveOverlayReadabilityLiftVeil01,
} from "../../layers/overlayReadabilityHints";
import type { RenderLineItem, RenderPlan, RenderRadialGradientFillItem } from "./renderPlanTypes";
import { circlePath2D, circlePathDescriptor } from "./circlePath2D";
import { clipPayloadDescriptor, createPath2DItem } from "./pathItemFactories";
import { parseCssColorToRgba8888 } from "../../color/contrastForegroundOnCssBackground";
import {
  DEFAULT_SUBLUNAR_MARKER_APPEARANCE,
  LIBRATION_UNDERSTROKE_DARK_RGB,
  LIBRATION_UNDERSTROKE_LIGHT_RGB,
  librationCrosshairArmPx,
  librationDisplayOffsetPx,
  librationRingRadiusPx,
  librationStrokeWidthPx,
  librationUnderStrokeKind,
  librationUnderStrokeWidthPx,
  normalizeSublunarMarkerAppearance,
  rotateLibrationOffsetPx,
  rotateScreenPoint,
  sublunarMarkerRadiusPx,
  type SublunarMarkerAppearance,
} from "../../core/sublunarMarkerAppearance";
import type { EarthShadowCueAppearance, EarthShadowOverlayAppearance } from "../../layers/sublunarMarkerPayload";

export function buildSubsolarMarkerRenderPlan(options: {
  viewportWidthPx: number;
  viewportHeightPx: number;
  camera?: SceneCamera;
  frame?: SceneReferenceFrame;
  lonDeg: number;
  latDeg: number;
  readability?: OverlayReadabilityHints | null;
}): RenderPlan {
  const w = options.viewportWidthPx;
  const h = options.viewportHeightPx;
  const items: RenderPlan["items"] = [];
  if (!(w > 0) || !(h > 0)) {
    return { items };
  }
  const camera = options.camera ?? IDENTITY_SCENE_CAMERA;
  const frame = options.frame ?? EARTH_FIXED_SCENE_REFERENCE_FRAME;

  const v = effectiveOverlayReadabilityLiftVeil01(
    options.readability?.nightVeil01,
    options.readability?.overlayReadabilityLiftScale01,
  );
  const sw = (base: number) => Math.max(base, base * (1 + 0.65 * v));
  const a = (x: number) => Math.min(1, x * (1 + 0.22 * v));

  const baseCx = sceneXFromLongitudeDeg(options.lonDeg, w, camera, frame);
  const cy = sceneYFromLatitudeDeg(options.latDeg, h, camera, frame);
  const r = Math.min(9, Math.max(4.5, w * 0.0055));
  const copies = sceneCameraHorizontalWorldCopyOffsets(camera, w);

  for (const k of copies) {
    const cx = baseCx + sceneXShiftForWorldCopy(w, camera, k);
    if (cx < -r * 4 || cx > w + r * 4) {
      continue;
    }

  const glow: RenderRadialGradientFillItem = {
    kind: "radialGradientFill",
    x0: cx,
    y0: cy,
    r0: r * 0.15,
    x1: cx,
    y1: cy,
    r1: r * 2.4,
    stops: [
      { offset: 0, color: `rgba(255, 228, 140, ${a(0.5)})` },
      { offset: 0.45, color: `rgba(255, 200, 90, ${a(0.12)})` },
      { offset: 1, color: "rgba(255, 190, 70, 0)" },
    ],
    clipCx: cx,
    clipCy: cy,
    clipR: r * 2.4,
  };
  items.push(glow);

  const rayStroke = `rgba(255, 240, 200, ${a(0.88)})`;
  const rayWidth = sw(Math.max(1, r * 0.11));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const inner = r * 1.12;
    const outer = r * 1.48;
    const line: RenderLineItem = {
      kind: "line",
      x1: cx + Math.cos(a) * inner,
      y1: cy + Math.sin(a) * inner,
      x2: cx + Math.cos(a) * outer,
      y2: cy + Math.sin(a) * outer,
      stroke: rayStroke,
      strokeWidthPx: rayWidth,
      lineCap: "round",
    };
    items.push(line);
  }

  items.push({
    kind: "path2d",
    pathKind: "path2d",
    path: circlePath2D(cx, cy, r),
    fill: `rgba(255, 210, 72, ${a(0.96)})`,
    stroke: `rgba(28, 22, 10, ${a(0.78)})`,
    strokeWidthPx: sw(Math.max(1.1, r * 0.13)),
  });

  items.push({
    kind: "path2d",
    pathKind: "path2d",
    path: circlePath2D(cx, cy, r + 1.25),
    stroke: `rgba(255, 255, 255, ${a(0.42)})`,
    strokeWidthPx: sw(1),
  });
  }

  return { items };
}

/**
 * Sub-lunar disc + halo + terminator (same model as legacy backend; phase inputs are plain numbers).
 * Optional optical-libration mark is presentation only; astronomy stays upstream.
 */
export function buildSublunarMarkerRenderPlan(options: {
  viewportWidthPx: number;
  viewportHeightPx: number;
  camera?: SceneCamera;
  frame?: SceneReferenceFrame;
  lonDeg: number;
  latDeg: number;
  illuminatedFraction: number;
  waxing: boolean;
  librationLongitudeDeg?: number;
  librationLatitudeDeg?: number;
  /** Presentation rotation only (degrees). 0 = map-oriented. */
  librationOrientationDeg?: number;
  appearance?: Partial<SublunarMarkerAppearance>;
  readability?: OverlayReadabilityHints | null;
  earthShadowOverlay?: EarthShadowOverlayAppearance | null;
  earthShadowCue?: EarthShadowCueAppearance | null;
}): RenderPlan {
  const w = options.viewportWidthPx;
  const h = options.viewportHeightPx;
  const items: RenderPlan["items"] = [];
  if (!(w > 0) || !(h > 0)) {
    return { items };
  }
  const camera = options.camera ?? IDENTITY_SCENE_CAMERA;
  const frame = options.frame ?? EARTH_FIXED_SCENE_REFERENCE_FRAME;

  const v = effectiveOverlayReadabilityLiftVeil01(
    options.readability?.nightVeil01,
    options.readability?.overlayReadabilityLiftScale01,
  );
  const sw = (base: number) => Math.max(base, base * (1 + 0.7 * v));
  const a = (x: number) => Math.min(1, x * (1 + 0.25 * v));

  const appearance = normalizeSublunarMarkerAppearance(
    options.appearance ?? DEFAULT_SUBLUNAR_MARKER_APPEARANCE,
  );
  const baseCx = sceneXFromLongitudeDeg(options.lonDeg, w, camera, frame);
  const cy = sceneYFromLatitudeDeg(options.latDeg, h, camera, frame);
  const r = sublunarMarkerRadiusPx(w, appearance.size);
  const f = Math.min(1, Math.max(0, options.illuminatedFraction));
  const waxing = options.waxing;
  const pad = r * 2.5;
  const copies = sceneCameraHorizontalWorldCopyOffsets(camera, w);

  for (const k of copies) {
    const cx = baseCx + sceneXShiftForWorldCopy(w, camera, k);
    if (cx < -r * 4 || cx > w + r * 4) {
      continue;
    }

  items.push({
    kind: "radialGradientFill",
    x0: cx,
    y0: cy,
    r0: r * 0.2,
    x1: cx,
    y1: cy,
    r1: r * 2.1,
    stops: [
      { offset: 0, color: `rgba(200, 220, 255, ${a(0.35)})` },
      { offset: 0.5, color: `rgba(140, 175, 220, ${a(0.1)})` },
      { offset: 1, color: "rgba(100, 140, 190, 0)" },
    ],
    clipCx: cx,
    clipCy: cy,
    clipR: r * 2.1,
  });

  if (options.earthShadowCue && options.earthShadowCue.strength01 > 0) {
    pushEarthShadowCue(items, {
      cx,
      cy,
      r,
      cue: options.earthShadowCue,
      orientationDeg: options.librationOrientationDeg ?? 0,
    });
  }

  items.push({
    kind: "radialGradientFill",
    x0: cx - r * 0.25,
    y0: cy - r * 0.2,
    r0: r * 0.1,
    x1: cx,
    y1: cy,
    r1: r * 1.05,
    stops: [
      { offset: 0, color: `rgba(235, 242, 255, ${a(0.98)})` },
      { offset: 0.55, color: `rgba(200, 218, 242, ${a(0.95)})` },
      { offset: 1, color: `rgba(175, 198, 228, ${a(0.92)})` },
    ],
    clipCx: cx,
    clipCy: cy,
    clipR: r,
  });

  const xTerm = waxing ? r * (1 - 2 * f) : r * (2 * f - 1);
  const shadow = `rgba(28, 38, 56, ${a(0.9)})`;

  let quadPath: Path2D;
  if (waxing) {
    quadPath = new Path2D(
      `M ${cx - pad},${cy - pad} L ${cx + xTerm},${cy - pad} L ${cx + xTerm},${cy + pad} L ${cx - pad},${cy + pad} Z`,
    );
  } else {
    quadPath = new Path2D(
      `M ${cx + xTerm},${cy - pad} L ${cx + pad},${cy - pad} L ${cx + pad},${cy + pad} L ${cx + xTerm},${cy + pad} Z`,
    );
  }

  items.push(
    createPath2DItem({
      path: quadPath,
      fill: shadow,
      clip: clipPayloadDescriptor(circlePathDescriptor(cx, cy, r)),
    }),
  );

  if (f > 0.88 && f <= 1) {
    items.push({
      kind: "path2d",
      pathKind: "path2d",
      path: circlePath2D(cx - r * 0.32, cy - r * 0.3, r * 0.2),
      fill: `rgba(255, 255, 255, ${a(0.2)})`,
    });
  }

  if (f > 0.06 && f < 0.94) {
    items.push({
      kind: "line",
      x1: cx + xTerm,
      y1: cy - r * 1.02,
      x2: cx + xTerm,
      y2: cy + r * 1.02,
      stroke: `rgba(18, 26, 40, ${a(0.45)})`,
      strokeWidthPx: sw(Math.max(0.8, r * 0.09)),
    });
  }

  if (options.earthShadowOverlay) {
    pushEarthShadowOverlay(items, {
      cx,
      cy,
      r,
      overlay: options.earthShadowOverlay,
      orientationDeg: options.librationOrientationDeg ?? 0,
    });
  }

  if (appearance.librationEnabled) {
    pushLibrationIndicator(items, {
      cx,
      cy,
      r,
      appearance,
      longitudeDeg: options.librationLongitudeDeg ?? 0,
      latitudeDeg: options.librationLatitudeDeg ?? 0,
      orientationDeg: options.librationOrientationDeg ?? 0,
      alpha: a,
    });
  }

  items.push({
    kind: "path2d",
    pathKind: "path2d",
    path: circlePath2D(cx, cy, r),
    stroke: `rgba(28, 40, 58, ${a(0.78)})`,
    strokeWidthPx: sw(Math.max(1, r * 0.14)),
  });

  items.push({
    kind: "path2d",
    pathKind: "path2d",
    path: circlePath2D(cx, cy, r + 1.1),
    stroke: `rgba(255, 255, 255, ${a(0.38)})`,
    strokeWidthPx: sw(1),
  });
  }

  return { items };
}

function cssStrokeRgba(css: string, alpha: number, fallbackRgb: string): string {
  const px = parseCssColorToRgba8888(css);
  if (!px) {
    return `rgba(${fallbackRgb}, ${alpha})`;
  }
  return `rgba(${px.r}, ${px.g}, ${px.b}, ${alpha})`;
}

function pushLibrationIndicator(
  items: RenderPlan["items"],
  args: {
    cx: number;
    cy: number;
    r: number;
    appearance: SublunarMarkerAppearance;
    longitudeDeg: number;
    latitudeDeg: number;
    orientationDeg: number;
    alpha: (x: number) => number;
  },
): void {
  const markR = librationRingRadiusPx(args.r);
  const strokeW = librationStrokeWidthPx(args.r, args.appearance.librationThickness);
  const mapOffset = librationDisplayOffsetPx({
    longitudeDeg: args.longitudeDeg,
    latitudeDeg: args.latitudeDeg,
    moonRadiusPx: args.r,
    motionScale: args.appearance.librationMotionScale,
    markRadiusPx: args.appearance.librationStyle === "ring" ? markR : 0.12 * args.r,
    strokeWidthPx: strokeW,
  });
  const offset = rotateLibrationOffsetPx(mapOffset, args.orientationDeg);
  const ix = args.cx + offset.dxPx;
  const iy = args.cy + offset.dyPx;
  const clip = clipPayloadDescriptor(circlePathDescriptor(args.cx, args.cy, args.r));
  const color = cssStrokeRgba(args.appearance.librationColor, args.alpha(0.92), "197, 212, 232");
  const underKind = librationUnderStrokeKind(args.appearance.librationColor);
  const underRgb =
    underKind === "dark" ? LIBRATION_UNDERSTROKE_DARK_RGB : LIBRATION_UNDERSTROKE_LIGHT_RGB;
  const under = `rgba(${underRgb}, ${args.alpha(underKind === "dark" ? 0.72 : 0.82)})`;
  const underW = librationUnderStrokeWidthPx(strokeW);
  if (args.appearance.librationStyle === "crosshair") {
    const arm = librationCrosshairArmPx(args.r);
    const e1 = rotateScreenPoint(ix - arm, iy, ix, iy, args.orientationDeg);
    const e2 = rotateScreenPoint(ix + arm, iy, ix, iy, args.orientationDeg);
    const n1 = rotateScreenPoint(ix, iy - arm, ix, iy, args.orientationDeg);
    const n2 = rotateScreenPoint(ix, iy + arm, ix, iy, args.orientationDeg);
    const cross = new Path2D(
      `M ${e1.x},${e1.y} L ${e2.x},${e2.y} M ${n1.x},${n1.y} L ${n2.x},${n2.y}`,
    );
    items.push(
      createPath2DItem({
        path: cross,
        stroke: under,
        strokeWidthPx: underW,
        clip,
      }),
    );
    items.push(
      createPath2DItem({
        path: cross,
        stroke: color,
        strokeWidthPx: strokeW,
        clip,
      }),
    );
    return;
  }
  items.push(
    createPath2DItem({
      path: circlePath2D(ix, iy, markR),
      stroke: under,
      strokeWidthPx: underW,
      clip,
    }),
  );
  items.push(
    createPath2DItem({
      path: circlePath2D(ix, iy, markR),
      stroke: color,
      strokeWidthPx: strokeW,
      clip,
    }),
  );
}

/**
 * Map-oriented Earth-shadow offset (east right, north up) rotated by the same
 * observer χ used for the libration mark. Screen y increases downward.
 */
export function earthShadowScreenOffsetPx(
  offsetEastMoonRadii: number,
  offsetNorthMoonRadii: number,
  moonRadiusPx: number,
  orientationDeg: number,
): { dxPx: number; dyPx: number } {
  return rotateLibrationOffsetPx(
    {
      dxPx: offsetEastMoonRadii * moonRadiusPx,
      dyPx: -offsetNorthMoonRadii * moonRadiusPx,
    },
    orientationDeg,
  );
}

export function earthShadowCueScreenUnit(
  offsetEastMoonRadii: number,
  offsetNorthMoonRadii: number,
  orientationDeg: number,
): { ux: number; uy: number } | null {
  const offset = earthShadowScreenOffsetPx(
    offsetEastMoonRadii,
    offsetNorthMoonRadii,
    1,
    orientationDeg,
  );
  const mag = Math.hypot(offset.dxPx, offset.dyPx);
  if (!(mag > 1e-9)) {
    return null;
  }
  return { ux: offset.dxPx / mag, uy: offset.dyPx / mag };
}

function pushEarthShadowCue(
  items: RenderPlan["items"],
  args: {
    cx: number;
    cy: number;
    r: number;
    cue: EarthShadowCueAppearance;
    orientationDeg: number;
  },
): void {
  const dir = earthShadowCueScreenUnit(
    args.cue.offsetEastMoonRadii,
    args.cue.offsetNorthMoonRadii,
    args.orientationDeg,
  );
  if (!dir) {
    return;
  }
  const strength = Math.max(0, Math.min(1, args.cue.strength01));
  const lengthPx = Math.max(args.r * 1.6, args.cue.lengthMoonRadii * args.r);
  const tipX = args.cx + dir.ux * args.r * 0.96;
  const tipY = args.cy + dir.uy * args.r * 0.96;
  const originX = args.cx + dir.ux * (args.r + lengthPx);
  const originY = args.cy + dir.uy * (args.r + lengthPx);
  const px = -dir.uy;
  const py = dir.ux;
  const a = strength * Math.max(0.2, args.cue.alphaScale);
  const outerHalf = args.r * (0.38 + 0.1 * strength);
  const coreHalf = args.r * 0.13;
  const innerHalf = args.r * 0.035;
  const wedge = (originHalf: number, tipHalf: number): Path2D => {
    const path = new Path2D();
    path.moveTo(originX + px * originHalf, originY + py * originHalf);
    path.lineTo(originX - px * originHalf, originY - py * originHalf);
    path.lineTo(tipX - px * tipHalf, tipY - py * tipHalf);
    path.lineTo(tipX + px * tipHalf, tipY + py * tipHalf);
    path.closePath();
    return path;
  };
  items.push(
    createPath2DItem({
      path: wedge(outerHalf, innerHalf * 1.8),
      fill: `rgba(108, 136, 164, ${(0.1 + 0.16 * a).toFixed(3)})`,
    }),
  );
  items.push(
    createPath2DItem({
      path: wedge(coreHalf, innerHalf),
      fill: `rgba(28, 22, 38, ${(0.16 + 0.22 * a).toFixed(3)})`,
    }),
  );
}

function pushEarthShadowOverlay(
  items: RenderPlan["items"],
  args: {
    cx: number;
    cy: number;
    r: number;
    overlay: EarthShadowOverlayAppearance;
    orientationDeg: number;
  },
): void {
  const clip = clipPayloadDescriptor(circlePathDescriptor(args.cx, args.cy, args.r));
  const offset = earthShadowScreenOffsetPx(
    args.overlay.offsetEastMoonRadii,
    args.overlay.offsetNorthMoonRadii,
    args.r,
    args.orientationDeg,
  );
  const sx = args.cx + offset.dxPx;
  const sy = args.cy + offset.dyPx;
  const outerR = Math.max(0, args.overlay.outerRadiusMoonRadii * args.r);
  const innerR = Math.max(0, args.overlay.innerRadiusMoonRadii * args.r);
  const umbral = Math.max(0, Math.min(1, args.overlay.umbralCoverage01));
  const penumbral = Math.max(0, Math.min(1, args.overlay.penumbralCoverage01));
  if (outerR > 0.5 && penumbral > 0.001) {
    const penAlpha = 0.08 + 0.14 * penumbral;
    const coreR = innerR > 0.5 ? Math.min(innerR, outerR * 0.92) : outerR * 0.35;
    items.push({
      kind: "radialGradientFill",
      x0: sx,
      y0: sy,
      r0: Math.max(0, coreR * 0.35),
      x1: sx,
      y1: sy,
      r1: outerR,
      stops: [
        { offset: 0, color: `rgba(24, 30, 52, ${penAlpha.toFixed(3)})` },
        { offset: 0.62, color: `rgba(28, 36, 64, ${(penAlpha * 0.42).toFixed(3)})` },
        { offset: 1, color: "rgba(28, 36, 64, 0)" },
      ],
      clipCx: args.cx,
      clipCy: args.cy,
      clipR: args.r,
    });
  }
  if (innerR > 0.5 && umbral > 0.001) {
    items.push(
      createPath2DItem({
        path: circlePath2D(sx, sy, innerR),
        fill: `rgba(12, 10, 22, ${(0.4 + 0.32 * umbral).toFixed(3)})`,
        clip,
      }),
    );
    const redA = 0.52 * Math.pow(umbral, 2.6);
    if (redA > 0.08) {
      items.push({
        kind: "radialGradientFill",
        x0: sx,
        y0: sy,
        r0: 0,
        x1: sx,
        y1: sy,
        r1: innerR,
        stops: [
          { offset: 0, color: `rgba(118, 38, 24, ${redA.toFixed(3)})` },
          { offset: 0.55, color: `rgba(88, 28, 20, ${(redA * 0.7).toFixed(3)})` },
          { offset: 1, color: `rgba(48, 16, 14, ${(redA * 0.18).toFixed(3)})` },
        ],
        clipCx: args.cx,
        clipCy: args.cy,
        clipR: args.r,
      });
    }
  }
}
