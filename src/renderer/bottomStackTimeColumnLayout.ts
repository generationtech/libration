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
 * Deterministic ink-width estimates and colon-column alignment for the lower-left HUD time stack.
 * Used so multi-row times share a common time-column origin and aligned ":" positions without relying on
 * fragile fixed string padding alone at plan time (render still uses proportional fonts).
 */

/** Rough per-character ink width for bottom HUD Latin/digit wall-clock strings at `fontSizePx`. */
export function estimateBottomHudLatinInkWidthPx(text: string, fontSizePx: number): number {
  const u = fontSizePx;
  let w = 0;
  for (const ch of text) {
    if (ch === " " || ch === "\u00a0") {
      w += u * 0.28;
    } else if (ch >= "0" && ch <= "9") {
      w += u * 0.56;
    } else if (ch === ":") {
      w += u * 0.32;
    } else if (ch === "A" || ch === "P" || ch === "M") {
      w += u * 0.48;
    } else {
      w += u * 0.52;
    }
  }
  return w;
}

function splitAtFirstColon(s: string): { prefix: string; suffix: string } {
  const idx = s.indexOf(":");
  if (idx < 0) {
    return { prefix: s, suffix: "" };
  }
  return { prefix: s.slice(0, idx), suffix: s.slice(idx) };
}

function padPrefixToTargetInkWidth(prefix: string, targetInkPx: number, fontSizePx: number): string {
  let p = prefix;
  while (estimateBottomHudLatinInkWidthPx(p, fontSizePx) < targetInkPx - 0.25) {
    p = ` ${p}`;
  }
  return p;
}

/**
 * When two or more clock bodies are shown, pad hour/minute prefixes so the first ":" shares a vertical column.
 */
export function alignBottomStackTimeBodiesToColonColumn(bodies: string[], fontSizePx: number): string[] {
  if (bodies.length < 2) {
    return bodies.slice();
  }
  const parts = bodies.map(splitAtFirstColon);
  const target = Math.max(
    ...parts.map(({ prefix }) => estimateBottomHudLatinInkWidthPx(prefix, fontSizePx)),
    0,
  );
  return parts.map(({ prefix, suffix }) => padPrefixToTargetInkWidth(prefix, target, fontSizePx) + suffix);
}

/** Max ink width among non-null short labels (Refer / UTC / Local). */
export function maxBottomStackLabelColumnInkWidthPx(
  labels: (string | null)[],
  fontSizePx: number,
): number {
  let m = 0;
  for (const s of labels) {
    if (s !== null && s.length > 0) {
      m = Math.max(m, estimateBottomHudLatinInkWidthPx(s, fontSizePx));
    }
  }
  return m;
}

/** Gap between label column and time column (scales with HUD font size). */
export function bottomStackLabelToTimeGapPx(fontSizePx: number): number {
  return Math.max(5, Math.round(fontSizePx * 0.38));
}
