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
 * Dev-only sweep diagnostics for 24h text hour-disk row insets: mirrors the live Canvas path
 * ({@link computeAlphabeticFillTextYForLayoutCenterYPx} + {@link measureText}) without changing runtime behavior
 * unless explicitly invoked from the console or tooling.
 */

import {
  cloneHourMarkersConfig,
  DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
  effectiveTopBandHourMarkerSelection,
} from "../config/appConfig.ts";
import { computeTextModeLayoutDiskBandVerticalMetrics } from "../config/topBandHourMarkersLayout.ts";
import { hourMarkerRepresentationSpecForTopBandEffectiveSelection } from "../config/topBandVisualPolicy.ts";
import { resolveHourMarkerGlyphStyle } from "../glyphs/glyphStyles.ts";
import { loadBundledFontAssetRegistry } from "../typography/fontAssetRegistry.ts";
import type { ResolvedTextStyle } from "../typography/typographyTypes.ts";
import { resolveTextStyle } from "../typography/typographyResolver.ts";
import { canvasFontStringFromRenderTextFont } from "../renderer/canvas/canvasTextFontBridge.ts";
import type { RenderFontStyle } from "../renderer/renderPlan/renderPlanTypes.ts";
import {
  buildTextMode24hIndicatorConsolidatedVerticalDiagnostics,
  computeAlphabeticFillTextYForLayoutCenterYPx,
  computeTextMode24hIndicatorVerticalSnapshot,
} from "../renderer/textMode24hIndicatorVerticalDiagnostics.ts";
import type { Viewport } from "../renderer/types.ts";

/** Explicit (configuredTop, configuredBottom) px pairs for inset sweep reports. */
export const TEXT_MODE_24H_INSET_SWEEP_CASES: readonly { id: string; top: number; bottom: number }[] = [
  { id: "A_baseline", top: 0, bottom: 0 },
  { id: "B_top1", top: 1, bottom: 0 },
  { id: "B_top2", top: 2, bottom: 0 },
  { id: "B_top4", top: 4, bottom: 0 },
  { id: "B_top8", top: 8, bottom: 0 },
  { id: "B_top12", top: 12, bottom: 0 },
  { id: "C_bottom1", top: 0, bottom: 1 },
  { id: "C_bottom2", top: 0, bottom: 2 },
  { id: "C_bottom4", top: 0, bottom: 4 },
  { id: "C_bottom8", top: 0, bottom: 8 },
  { id: "C_bottom12", top: 0, bottom: 12 },
  { id: "D_sym44", top: 4, bottom: 4 },
  { id: "D_sym88", top: 8, bottom: 8 },
];

export type TextMode24hInsetSweepMeasuredRow = {
  caseId: string;
  configuredTopInsetPx: number;
  configuredBottomInsetPx: number;
  diskRowTopYPx: number;
  diskRowBottomYPx: number;
  diskRowHeightPx: number;
  textCenterYPx: number;
  baselineYPx: number;
  layoutSizePx: number;
  fontSizePx: number;
  glyphTopYPx: number;
  glyphBottomYPx: number;
  glyphHeightPx: number;
  visibleTopGapPx: number;
  visibleBottomGapPx: number;
  solvedMarkerRadiusPx: number;
  markerContentSizePx: number;
  structuralDiskRowSlackPx: number;
  intrinsicDiskBandForSizingPx: number;
  markerRadiusDiskBandHPx: number;
  textCoreHeightPx: number;
  textCenterYFromDiskRowTopPx: number;
  topPadInsideDiskPx: number;
  bottomPadInsideDiskPx: number;
  emitTextBaselineShiftPx: number;
  /** Canvas {@link TextMetrics} ink extents (same font string as live draw). */
  actualBoundingBoxAscentPx: number;
  actualBoundingBoxDescentPx: number;
  /** Non-disk space above disk row inside the circle band (padTop + upperNumeral + gap→disk). */
  marginAboveDiskRowInCircleBandPx: number;
  /** Sum padTop + gapNumeralToDisk (+ upperNumeral when non-zero). */
  topPairPx: number;
  circleBandHeightPx: number;
  /** Notes on integer rounding / stack solver (informational). */
  layoutRoundingNotes: string[];
};

export type TextMode24hInsetSweepResult = {
  viewport: Viewport;
  representativeLabel: string;
  canvasFontString: string;
  rows: TextMode24hInsetSweepMeasuredRow[];
  baselineCaseId: string;
};

export type TextMode24hInsetSweepDeltaRow = {
  caseId: string;
  deltaVisibleTopGapPx: number;
  deltaVisibleBottomGapPx: number;
  deltaDiskRowHeightPx: number;
  deltaTextCenterYPx: number;
  deltaGlyphTopYPx: number;
  deltaGlyphBottomYPx: number;
};

/** Deltas vs the baseline row ({@link TextMode24hInsetSweepResult.baselineCaseId}). */
export function computeTextMode24hInsetSweepDeltas(result: TextMode24hInsetSweepResult): TextMode24hInsetSweepDeltaRow[] {
  const base = result.rows.find((r) => r.caseId === result.baselineCaseId);
  if (base === undefined) {
    throw new Error(`computeTextMode24hInsetSweepDeltas: missing baseline ${result.baselineCaseId}`);
  }
  return result.rows.map((r) => ({
    caseId: r.caseId,
    deltaVisibleTopGapPx: r.visibleTopGapPx - base.visibleTopGapPx,
    deltaVisibleBottomGapPx: r.visibleBottomGapPx - base.visibleBottomGapPx,
    deltaDiskRowHeightPx: r.diskRowHeightPx - base.diskRowHeightPx,
    deltaTextCenterYPx: r.textCenterYPx - base.textCenterYPx,
    deltaGlyphTopYPx: r.glyphTopYPx - base.glyphTopYPx,
    deltaGlyphBottomYPx: r.glyphBottomYPx - base.glyphBottomYPx,
  }));
}

function renderFontStyleFromResolved(style: ResolvedTextStyle): RenderFontStyle {
  const weight = style.fontWeight ?? 400;
  return {
    assetId: style.fontAssetId,
    displayName: style.displayName,
    sizePx: style.fontSizePx,
    weight: typeof weight === "number" ? weight : weight,
    style: style.fontStyle,
    ...(style.lineHeightPx !== undefined ? { lineHeightPx: style.lineHeightPx } : {}),
  };
}

function layoutRoundingNotesFromSnapshot(snap: ReturnType<typeof computeTextMode24hIndicatorVerticalSnapshot>): string[] {
  const notes: string[] = [];
  const d = snap.diskRowHeightPx;
  const raw = snap.textCoreHeightPx + snap.topPadInsideDiskPx + snap.bottomPadInsideDiskPx;
  if (Math.abs(d - raw) > 0.001) {
    notes.push(`diskRowHeightPx=${d} vs core+insets=${raw} (unexpected for layout vm)`);
  }
  notes.push(
    `text-led stack: diskBandH=round(layout disk)=${d}; textCenterYFromDiskRowTop=topInset+textCoreHeight/2=${snap.textCoreHeightPx * 0.5 + snap.topPadInsideDiskPx}`,
  );
  notes.push(
    `circleStack: markerRadiusDiskBandHPx(intrinsic sizing)=${snap.circleStack.markerRadiusDiskBandHPx} vs layout diskBandH=${snap.circleStack.diskBandH}`,
  );
  return notes;
}

/**
 * Runs the same vertical math as the live 24h text disk row, then applies real Canvas {@link measureText} for "12".
 * Call after bundled fonts are ready ({@link document.fonts.ready}).
 */
export function runTextMode24hInsetSweepInBrowser(options?: {
  viewport?: Viewport;
  representativeLabel?: string;
}): TextMode24hInsetSweepResult {
  const viewport = options?.viewport ?? { width: 1200, height: 800, devicePixelRatio: 1 };
  const representativeLabel = options?.representativeLabel ?? "12";
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    throw new Error("runTextMode24hInsetSweepInBrowser: 2d context unavailable");
  }
  const fontRegistry = loadBundledFontAssetRegistry();
  const baseHm = cloneHourMarkersConfig(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers);
  const hourSel = effectiveTopBandHourMarkerSelection({
    ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
    hourMarkers: baseHm,
  });
  const spec = hourMarkerRepresentationSpecForTopBandEffectiveSelection(hourSel);
  const gStyle = resolveHourMarkerGlyphStyle(spec.glyphStyleId ?? "topBandHourDefault");
  const baselineShiftFrac = gStyle.text.baselineShiftFrac ?? 0;

  const rows: TextMode24hInsetSweepMeasuredRow[] = [];

  let canvasFontString = "";

  for (const c of TEXT_MODE_24H_INSET_SWEEP_CASES) {
    const hourMarkers = cloneHourMarkersConfig(baseHm);
    hourMarkers.layout.textTopMarginPx = c.top;
    hourMarkers.layout.textBottomMarginPx = c.bottom;

    const snap = computeTextMode24hIndicatorVerticalSnapshot({
      viewport,
      displayChromeLayout: {
        ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
        hourMarkers,
      },
    });

    const vm = computeTextModeLayoutDiskBandVerticalMetrics({
      fontSizePx: snap.markerContentSizePx,
      sizeMultiplier: snap.sizeMultiplier,
      rowTopInsetPx: c.top,
      rowBottomInsetPx: c.bottom,
      glyphInkMetrics: snap.circleStack.text24hLayoutGlyphInkMetrics,
    });

    const resolvedStyle = resolveTextStyle(fontRegistry, spec.textRole, {
      fontSizePx: snap.markerContentSizePx,
    });
    const renderFont = renderFontStyleFromResolved(resolvedStyle);
    canvasFontString = canvasFontString || canvasFontStringFromRenderTextFont(renderFont);
    ctx.font = canvasFontString;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "center";

    const metrics = ctx.measureText(representativeLabel);
    const layoutCenterInputYPx = snap.textAnchorYPx + snap.markerContentSizePx * baselineShiftFrac;
    const fillTextYPx = computeAlphabeticFillTextYForLayoutCenterYPx(layoutCenterInputYPx, metrics);

    const pre = {
      structuralHour0To23: 12 as const,
      diskRowTopYPx: snap.diskRowTopYPx,
      diskRowBottomYPx: snap.diskRowBottomYPx,
      diskRowHeightPx: snap.diskRowHeightPx,
      layoutSizePx: snap.markerContentSizePx,
      textCoreHeightPx: vm.textCoreHeightPx,
      textCenterYPx: snap.textAnchorYPx,
      baselineShiftPx: snap.markerContentSizePx * baselineShiftFrac,
      fillTextAnchorYPx: layoutCenterInputYPx,
      topInsetPx: vm.topPadInsideDiskPx,
      bottomInsetPx: vm.bottomPadInsideDiskPx,
    };

    const consolidated = buildTextMode24hIndicatorConsolidatedVerticalDiagnostics({
      pre,
      fontSizePx: resolvedStyle.fontSizePx,
      textBaseline: "alphabetic",
      fillTextAnchorYPx: fillTextYPx,
      metrics,
    });
    const cs = snap.circleStack;

    rows.push({
      caseId: c.id,
      configuredTopInsetPx: consolidated.configuredTopInsetPx,
      configuredBottomInsetPx: consolidated.configuredBottomInsetPx,
      diskRowTopYPx: consolidated.diskRowTopYPx,
      diskRowBottomYPx: consolidated.diskRowBottomYPx,
      diskRowHeightPx: consolidated.diskRowHeightPx,
      textCenterYPx: consolidated.textCenterYPx,
      baselineYPx: consolidated.baselineYPx,
      layoutSizePx: consolidated.layoutSizePx,
      fontSizePx: consolidated.fontSizePx,
      glyphTopYPx: consolidated.glyphTopYPx,
      glyphBottomYPx: consolidated.glyphBottomYPx,
      glyphHeightPx: consolidated.glyphHeightPx,
      visibleTopGapPx: consolidated.visibleTopGapPx,
      visibleBottomGapPx: consolidated.visibleBottomGapPx,
      solvedMarkerRadiusPx: snap.solvedMarkerRadiusPx,
      markerContentSizePx: snap.markerContentSizePx,
      structuralDiskRowSlackPx: vm.structuralDiskRowSlackPx,
      intrinsicDiskBandForSizingPx: snap.intrinsicDiskBandForSizingPx,
      markerRadiusDiskBandHPx: cs.markerRadiusDiskBandHPx ?? cs.diskBandH,
      textCoreHeightPx: vm.textCoreHeightPx,
      textCenterYFromDiskRowTopPx: vm.textCenterYFromDiskRowTopPx,
      topPadInsideDiskPx: vm.topPadInsideDiskPx,
      bottomPadInsideDiskPx: vm.bottomPadInsideDiskPx,
      emitTextBaselineShiftPx: snap.emitTextBaselineShiftPx,
      actualBoundingBoxAscentPx: consolidated.actualBoundingBoxAscent,
      actualBoundingBoxDescentPx: consolidated.actualBoundingBoxDescent,
      marginAboveDiskRowInCircleBandPx: snap.marginAboveDiskRowInCircleBandPx,
      topPairPx: cs.padTopPx + cs.upperNumeralH + cs.gapNumeralToDiskPx,
      circleBandHeightPx: snap.indicatorAreaHeightPx,
      layoutRoundingNotes: layoutRoundingNotesFromSnapshot(snap),
    });
  }

  return {
    viewport,
    representativeLabel,
    canvasFontString,
    rows,
    baselineCaseId: "A_baseline",
  };
}

/**
 * Attaches {@link runTextMode24hInsetSweepInBrowser} to `window` for devtools / headless tooling.
 */
export function attachTextMode24hInsetSweepToWindow(win: Window & typeof globalThis): void {
  const w = win as Window & {
    __LIBRATION_24H_INSET_SWEEP__?: () => Promise<TextMode24hInsetSweepResult>;
  };
  w.__LIBRATION_24H_INSET_SWEEP__ = async () => {
    await win.document.fonts.ready;
    return runTextMode24hInsetSweepInBrowser();
  };
}
