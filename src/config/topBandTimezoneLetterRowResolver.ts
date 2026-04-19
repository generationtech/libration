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
  rgbaForegroundWithAlpha,
} from "../color/contrastForegroundOnCssBackground.ts";
import type { DisplayChromeLayoutConfig } from "./appConfig.ts";
import {
  DEFAULT_TIMEZONE_LETTER_ROW_CELL_BACKGROUND_COLOR_EVEN,
  DEFAULT_TIMEZONE_LETTER_ROW_CELL_BACKGROUND_COLOR_ODD,
} from "./appConfig.ts";
import {
  TOP_CHROME_STYLE,
  TOP_CHROME_ZONE_LETTER_AUTOMATIC_FOREGROUND_ALPHA,
} from "./topChromeStyle.ts";

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
  /** True when {@link DisplayChromeLayoutConfig.timezoneLetterRowLetterForegroundColor} is a non-empty string. */
  usesAuthoredLetterForegroundOverride: boolean;
  effectiveBackgroundColorEven: string;
  effectiveBackgroundColorOdd: string;
  /** Final CSS color for NATO zone letters in the render plan. */
  effectiveLetterForegroundColor: string;
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
  const letterAuth = trimOptionalColor(layout.timezoneLetterRowLetterForegroundColor);

  const usesAuthoredCellBackgroundOverride = hasTimezoneCellBackgroundAuthorOverride(layout);
  const usesAuthoredLetterForegroundOverride = letterAuth !== undefined;

  const effectiveBackgroundColorEven = evenAuth ?? DEFAULT_TIMEZONE_LETTER_ROW_CELL_BACKGROUND_COLOR_EVEN;
  const effectiveBackgroundColorOdd = oddAuth ?? DEFAULT_TIMEZONE_LETTER_ROW_CELL_BACKGROUND_COLOR_ODD;

  let effectiveLetterForegroundColor: string;
  if (usesAuthoredLetterForegroundOverride) {
    effectiveLetterForegroundColor = letterAuth!;
  } else if (!usesAuthoredCellBackgroundOverride) {
    effectiveLetterForegroundColor = st.zoneText.letter;
  } else {
    const bw = bestBlackOrWhiteForegroundForTwoBackgroundsCss(
      effectiveBackgroundColorEven,
      effectiveBackgroundColorOdd,
    );
    effectiveLetterForegroundColor = rgbaForegroundWithAlpha(
      bw,
      TOP_CHROME_ZONE_LETTER_AUTOMATIC_FOREGROUND_ALPHA,
    );
  }

  return {
    usesAuthoredCellBackgroundOverride,
    usesAuthoredLetterForegroundOverride,
    effectiveBackgroundColorEven,
    effectiveBackgroundColorOdd,
    effectiveLetterForegroundColor,
  };
}
