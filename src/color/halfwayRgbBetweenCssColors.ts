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
 * Deterministic sRGB channel interpolation between two parseable CSS color strings.
 * `t = 0` → `a`; `t = 1` → `b`; channel values are rounded and clamped to [0, 255].
 * Unparseable inputs fall back to `#808080` for the whole result.
 */

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function parseHexToRgb255(s: string): { r: number; g: number; b: number } | undefined {
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
  if (![r, g, b].every((x) => Number.isFinite(x))) {
    return undefined;
  }
  return { r, g, b };
}

function parseRgbFunctionToRgb255(s: string): { r: number; g: number; b: number } | undefined {
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
  return { r: clampByte(r), g: clampByte(g), b: clampByte(b) };
}

function parseCssColorToRgb255(css: string): { r: number; g: number; b: number } | undefined {
  const t = css.trim();
  const hex = parseHexToRgb255(t);
  if (hex) {
    return hex;
  }
  return parseRgbFunctionToRgb255(t);
}

function clampUnitT(t: number): number {
  if (!Number.isFinite(t)) {
    return 0;
  }
  return Math.max(0, Math.min(1, t));
}

/**
 * Returns `rgb(r,g,b)` with each channel linearly interpolated from `a` toward `b` by `t` (same parse rules as
 * {@link halfwayRgbStringBetweenCssColors}).
 */
export function interpolateRgbStringBetweenCssColors(a: string, b: string, t: number): string {
  const ca = parseCssColorToRgb255(a);
  const cb = parseCssColorToRgb255(b);
  if (ca === undefined || cb === undefined) {
    return "rgb(128, 128, 128)";
  }
  const u = clampUnitT(t);
  const r = clampByte(ca.r + (cb.r - ca.r) * u);
  const g = clampByte(ca.g + (cb.g - ca.g) * u);
  const bCh = clampByte(ca.b + (cb.b - ca.b) * u);
  return `rgb(${r}, ${g}, ${bCh})`;
}

/**
 * Returns `rgb(r,g,b)` with each channel the arithmetic mean of the two inputs (same parse rules as contrast helpers).
 * Used for noon/midnight boxed-number highlight treatment color (indicator row background vs contrast foreground).
 */
export function halfwayRgbStringBetweenCssColors(a: string, b: string): string {
  return interpolateRgbStringBetweenCssColors(a, b, 0.5);
}
