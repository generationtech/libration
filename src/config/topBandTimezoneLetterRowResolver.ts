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
  bestBlackOrWhiteForegroundForTwoBackgroundsCss,
  blackOrWhiteForegroundForBackgroundCss,
  deriveDarkerNatoActiveCellBackgroundFromEvenOdd,
  rgbaForegroundWithAlpha,
} from "../color/contrastForegroundOnCssBackground.ts";
import type { DisplayChromeLayoutConfig } from "./appConfig.ts";
import {
  DEFAULT_TIMEZONE_LETTER_ROW_ACTIVE_CELL_BACKGROUND_COLOR,
  DEFAULT_TIMEZONE_LETTER_ROW_CELL_BACKGROUND_COLOR_EVEN,
  DEFAULT_TIMEZONE_LETTER_ROW_CELL_BACKGROUND_COLOR_ODD,
} from "./appConfig.ts";
import { TOP_CHROME_STYLE, TOP_CHROME_ZONE_LETTER_AUTOMATIC_FOREGROUND_ALPHA } from "./topChromeStyle.ts";

/** Defensive fallback when {@link deriveDarkerNatoActiveCellBackgroundFromEvenOdd} cannot parse effective even/odd fills. */
const ACTIVE_CELL_DERIVATION_FALLBACK_CSS = DEFAULT_TIMEZONE_LETTER_ROW_ACTIVE_CELL_BACKGROUND_COLOR;

function trimOptionalColor(raw: unknown): string | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }
  const t = raw.trim();
  return t === "" ? undefined : t;
}

function hasTimezoneCellBackgroundAuthorOverride(layout: DisplayChromeLayoutConfig): boolean {
  return (
    trimOptionalColor(layout.timezoneLetterRowCellBackgroundColorEven) !== undefined ||
    trimOptionalColor(layout.timezoneLetterRowCellBackgroundColorOdd) !== undefined
  );
}

/**
 * Resolved NATO / timezone letter row: alternating cell fills plus letter ink for render planning.
 */
export type EffectiveTimezoneLetterRowArea = {
  /** True when either even or odd cell background is a non-empty authored string. */
  usesAuthoredCellBackgroundOverride: boolean;
  /** True when {@link DisplayChromeLayoutConfig.timezoneLetterRowActiveCellBackgroundColor} is a non-empty string. */
  usesAuthoredActiveCellBackgroundOverride: boolean;
  /** True when {@link DisplayChromeLayoutConfig.timezoneLetterRowLetterForegroundColor} is a non-empty string. */
  usesAuthoredLetterForegroundOverride: boolean;
  effectiveBackgroundColorEven: string;
  effectiveBackgroundColorOdd: string;
  /** Read-point column (structural) cell fill for the render plan — not a second civil clock. */
  effectiveBackgroundColorActive: string;
  /** Final CSS color for NATO zone letters in the render plan (non-active cells, and active cell when no split). */
  effectiveLetterForegroundColor: string;
  /**
   * When set, the active column’s letter uses this instead of {@link effectiveLetterForegroundColor} (automatic ink
   * split for contrast on the darker active fill).
   */
  effectiveLetterForegroundColorActiveCell?: string;
};

/**
 * Resolves alternating NATO strip fills and letter ink from {@link DisplayChromeLayoutConfig}.
 * With no cell overrides and no letter override, letter ink matches {@link TOP_CHROME_STYLE.zoneText.letter} exactly.
 * With cell overrides and no letter override, ink is black or white at
 * {@link TOP_CHROME_ZONE_LETTER_AUTOMATIC_FOREGROUND_ALPHA} against both resolved backgrounds.
 */
export function resolveEffectiveTimezoneLetterRowArea(
  layout: DisplayChromeLayoutConfig,
): EffectiveTimezoneLetterRowArea {
  const st = TOP_CHROME_STYLE;
  const evenAuth = trimOptionalColor(layout.timezoneLetterRowCellBackgroundColorEven);
  const oddAuth = trimOptionalColor(layout.timezoneLetterRowCellBackgroundColorOdd);
  const activeAuth = trimOptionalColor(layout.timezoneLetterRowActiveCellBackgroundColor);
  const letterAuth = trimOptionalColor(layout.timezoneLetterRowLetterForegroundColor);

  const usesAuthoredCellBackgroundOverride = hasTimezoneCellBackgroundAuthorOverride(layout);
  const usesAuthoredActiveCellBackgroundOverride = activeAuth !== undefined;
  const usesAuthoredLetterForegroundOverride = letterAuth !== undefined;

  const effectiveBackgroundColorEven = evenAuth ?? DEFAULT_TIMEZONE_LETTER_ROW_CELL_BACKGROUND_COLOR_EVEN;
  const effectiveBackgroundColorOdd = oddAuth ?? DEFAULT_TIMEZONE_LETTER_ROW_CELL_BACKGROUND_COLOR_ODD;

  let effectiveBackgroundColorActive: string;
  if (usesAuthoredActiveCellBackgroundOverride) {
    effectiveBackgroundColorActive = activeAuth!;
  } else {
    effectiveBackgroundColorActive = deriveDarkerNatoActiveCellBackgroundFromEvenOdd(
      effectiveBackgroundColorEven,
      effectiveBackgroundColorOdd,
      ACTIVE_CELL_DERIVATION_FALLBACK_CSS,
    );
  }

  const sharedBwForAlternating =
    !usesAuthoredLetterForegroundOverride && usesAuthoredCellBackgroundOverride
      ? bestBlackOrWhiteForegroundForTwoBackgroundsCss(
          effectiveBackgroundColorEven,
          effectiveBackgroundColorOdd,
        )
      : undefined;

  let effectiveLetterForegroundColor: string;
  if (usesAuthoredLetterForegroundOverride) {
    effectiveLetterForegroundColor = letterAuth!;
  } else if (!usesAuthoredCellBackgroundOverride) {
    effectiveLetterForegroundColor = st.zoneText.letter;
  } else {
    effectiveLetterForegroundColor = rgbaForegroundWithAlpha(
      sharedBwForAlternating!,
      TOP_CHROME_ZONE_LETTER_AUTOMATIC_FOREGROUND_ALPHA,
    );
  }

  let effectiveLetterForegroundColorActiveCell: string | undefined = undefined;
  if (
    sharedBwForAlternating !== undefined &&
    sharedBwForAlternating !== blackOrWhiteForegroundForBackgroundCss(effectiveBackgroundColorActive)
  ) {
    effectiveLetterForegroundColorActiveCell = rgbaForegroundWithAlpha(
      blackOrWhiteForegroundForBackgroundCss(effectiveBackgroundColorActive),
      TOP_CHROME_ZONE_LETTER_AUTOMATIC_FOREGROUND_ALPHA,
    );
  }

  return {
    usesAuthoredCellBackgroundOverride,
    usesAuthoredActiveCellBackgroundOverride,
    usesAuthoredLetterForegroundOverride,
    effectiveBackgroundColorEven,
    effectiveBackgroundColorOdd,
    effectiveBackgroundColorActive,
    effectiveLetterForegroundColor,
    ...(effectiveLetterForegroundColorActiveCell !== undefined
      ? { effectiveLetterForegroundColorActiveCell }
      : {}),
  };
}
