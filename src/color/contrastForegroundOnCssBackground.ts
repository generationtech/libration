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
 * Deterministic black/white foreground selection for CSS background strings (renderer-agnostic).
 *
 * **Supported formats** (parsed for luminance): `#rgb`, `#rrggbb`, `rgb(r,g,b)`, `rgba(r,g,b,a)` with comma-separated
 * components (0–255 / alpha 0–1). Alpha in `rgba` is ignored for luminance; only RGB channels are used.
 *
 * **Unsupported** (e.g. `hsl()`, `color()`, space-separated `rgb`, named colors): parsing yields no luminance; callers
 * receive `#ffffff` from {@link blackOrWhiteForegroundForBackgroundCss} — always the same fallback for a given failure mode.
 */

/**
 * Picks `#000000` or `#ffffff` for maximum contrast against a CSS color string.
 * Uses sRGB relative luminance (WCAG); unparseable input falls back deterministically to `#ffffff`.
 */
export function blackOrWhiteForegroundForBackgroundCss(cssColor: string): "#000000" | "#ffffff" {
  const l = parseCssColorToLinearLuminance01(cssColor.trim());
  if (l === undefined) {
    return "#ffffff";
  }
  return l > 0.179 ? "#000000" : "#ffffff";
}

/**
 * `rgba(r,g,b,a)` with the given foreground and alpha (0–1). Foreground must be `#000000` or `#ffffff`.
 */
export function rgbaForegroundWithAlpha(
  foreground: "#000000" | "#ffffff",
  alpha: number,
): string {
  const a = Math.max(0, Math.min(1, alpha));
  const v = foreground === "#000000" ? 0 : 255;
  return `rgba(${v}, ${v}, ${v}, ${a})`;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function linearizeSrgbChannel(c01: number): number {
  const c = clamp01(c01);
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance for opaque sRGB. */
export function relativeLuminanceFromSrgb01(rgb: { r: number; g: number; b: number }): number {
  const r = linearizeSrgbChannel(rgb.r);
  const g = linearizeSrgbChannel(rgb.g);
  const b = linearizeSrgbChannel(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function parseCssColorToLinearLuminance01(css: string): number | undefined {
  const s = css.trim();
  const hex = parseHexToSrgb01(s);
  if (hex) {
    return relativeLuminanceFromSrgb01(hex);
  }
  const rgba = parseRgbFunctionToSrgb01(s);
  if (rgba) {
    return relativeLuminanceFromSrgb01(rgba);
  }
  return undefined;
}

/** WCAG contrast ratio for two relative luminances in [0, 1] (opaque sRGB). */
function wcagContrastRatio(lumA: number, lumB: number): number {
  const L1 = Math.max(lumA, lumB);
  const L2 = Math.min(lumA, lumB);
  return (L1 + 0.05) / (L2 + 0.05);
}

function contrastRatioTextOnBackground(fgLum01: 0 | 1, bgCss: string): number {
  const bgL = parseCssColorToLinearLuminance01(bgCss);
  if (bgL === undefined) {
    return 1;
  }
  return wcagContrastRatio(fgLum01, bgL);
}

/**
 * Picks `#000000` or `#ffffff` that maximizes the **minimum** WCAG contrast ratio against both backgrounds; breaks ties
 * by the higher **average** of the two ratios, then `#ffffff`.
 */
export function bestBlackOrWhiteForegroundForTwoBackgroundsCss(
  backgroundA: string,
  backgroundB: string,
): "#000000" | "#ffffff" {
  const score = (c: "#000000" | "#ffffff") => {
    const fgL = c === "#000000" ? 0 : 1;
    const ca = contrastRatioTextOnBackground(fgL, backgroundA);
    const cb = contrastRatioTextOnBackground(fgL, backgroundB);
    return { min: Math.min(ca, cb), avg: (ca + cb) / 2 };
  };
  const s0 = score("#000000");
  const s1 = score("#ffffff");
  if (s1.min > s0.min + 1e-9) {
    return "#ffffff";
  }
  if (s0.min > s1.min + 1e-9) {
    return "#000000";
  }
  if (s1.avg > s0.avg + 1e-9) {
    return "#ffffff";
  }
  if (s0.avg > s1.avg + 1e-9) {
    return "#000000";
  }
  return "#ffffff";
}

function parseHexToSrgb01(s: string): { r: number; g: number; b: number } | undefined {
  if (!s.startsWith("#")) {
    return undefined;
  }
  const raw = s.slice(1);
  let r: number;
  let g: number;
  let b: number;
  if (raw.length === 3) {
    r = parseInt(raw[0]! + raw[0]!, 16);
    g = parseInt(raw[1]! + raw[1]!, 16);
    b = parseInt(raw[2]! + raw[2]!, 16);
  } else if (raw.length === 6) {
    r = parseInt(raw.slice(0, 2), 16);
    g = parseInt(raw.slice(2, 4), 16);
    b = parseInt(raw.slice(4, 6), 16);
  } else {
    return undefined;
  }
  if (![r, g, b].every((n) => Number.isFinite(n))) {
    return undefined;
  }
  return { r: r / 255, g: g / 255, b: b / 255 };
}

function parseRgbFunctionToSrgb01(s: string): { r: number; g: number; b: number } | undefined {
  const m = s.match(/^rgba?\(\s*([^)]+)\s*\)$/i);
  if (!m) {
    return undefined;
  }
  const parts = m[1]!.split(",").map((p) => p.trim());
  if (parts.length < 3) {
    return undefined;
  }
  const r = parseFloat(parts[0]!);
  const g = parseFloat(parts[1]!);
  const b = parseFloat(parts[2]!);
  if (![r, g, b].every((n) => Number.isFinite(n))) {
    return undefined;
  }
  return { r: r / 255, g: g / 255, b: b / 255 };
}

/**
 * Parses supported CSS colors to 8-bit RGBA (same parse surface as luminance helpers: `#rgb`, `#rrggbb`, comma-`rgb`/`rgba`).
 */
export function parseCssColorToRgba8888(css: string): { r: number; g: number; b: number; a: number } | undefined {
  const s = css.trim();
  const hex = parseHexToSrgb01(s);
  if (hex) {
    return {
      r: Math.round(hex.r * 255),
      g: Math.round(hex.g * 255),
      b: Math.round(hex.b * 255),
      a: 1,
    };
  }
  const m = s.match(/^rgba?\(\s*([^)]+)\s*\)$/i);
  if (!m) {
    return undefined;
  }
  const parts = m[1]!.split(",").map((p) => p.trim());
  if (parts.length < 3) {
    return undefined;
  }
  const r = parseFloat(parts[0]!);
  const g = parseFloat(parts[1]!);
  const b = parseFloat(parts[2]!);
  const a = parts.length >= 4 ? parseFloat(parts[3]!) : 1;
  if (![r, g, b, a].every((n) => Number.isFinite(n))) {
    return undefined;
  }
  return { r, g, b, a: Math.max(0, Math.min(1, a)) };
}

/**
 * Present-time NATO cell background when alternating row colors are customized but the active cell is not overridden:
 * average the resolved even/odd sRGB channels, then multiply each channel by this factor (visibly darker than the pair).
 * Averaged alpha is preserved (clamped). On parse failure, returns `fallbackCss`.
 */
export const NATO_ACTIVE_CELL_DERIVED_DARKEN_SRGB_MUL = 0.48;

export function deriveDarkerNatoActiveCellBackgroundFromEvenOdd(
  evenCss: string,
  oddCss: string,
  fallbackCss: string,
): string {
  const a = parseCssColorToRgba8888(evenCss);
  const b = parseCssColorToRgba8888(oddCss);
  if (!a || !b) {
    return fallbackCss;
  }
  const r = Math.round((a.r + b.r) * 0.5 * NATO_ACTIVE_CELL_DERIVED_DARKEN_SRGB_MUL);
  const g = Math.round((a.g + b.g) * 0.5 * NATO_ACTIVE_CELL_DERIVED_DARKEN_SRGB_MUL);
  const bl = Math.round((a.b + b.b) * 0.5 * NATO_ACTIVE_CELL_DERIVED_DARKEN_SRGB_MUL);
  const alpha = Math.max(0, Math.min(1, (a.a + b.a) * 0.5));
  return `rgba(${r}, ${g}, ${bl}, ${alpha})`;
}
