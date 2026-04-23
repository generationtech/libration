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
 * Pure helpers for {@link BaseMapVariantMode} `"monthOfYear"` resolution.
 * Registry entries delegate here; callers supply explicit paths and optional onboarded months.
 */

export type MonthOfYearFamilyPaths = Readonly<{
  familyBaseSrc: string;
  /** January = index 0 … December = index 11 — full public URL paths */
  monthAssetSrcs: readonly string[] & { length: 12 };
  /**
   * Which months 1–12 are actually present as shipped static files (must match
   * `monthAssetSrcs` indices). This is registry metadata only — not filesystem
   * probing and not image-load fallbacks; keep it aligned with the repo.
   *
   * - **Omitted** — only valid when the family contract is a **full** 12-file
   *   set (treated as 1…12 are onboarded). Prefer listing `1…12` explicitly in
   *   production for clarity and to avoid false URLs when a subset is present.
   * - **Empty `[]`** — no monthly rasters; use `familyBaseSrc` only.
   * - **Partial list** — e.g. `[1, 2, 6]`; missing months are skipped by the
   *   backward walk until an onboarded month is found, then `familyBaseSrc` as needed.
   */
  onboardedMonths?: readonly number[];
}>;

/** UTC civil month in 1…12 from a Unix millisecond instant (product / render clock). */
export function calendarMonthUtc1To12FromUnixMs(ms: number): number {
  return new Date(ms).getUTCMonth() + 1;
}

/**
 * Walk order for missing-month lookback: current month first, then backward month-by-month,
 * wrapping across the year boundary (e.g. January → December).
 */
export function monthNumbersToTryBackwardsCivil(startMonth1To12: number): readonly number[] {
  const out: number[] = [];
  let m = startMonth1To12;
  for (let i = 0; i < 12; i++) {
    out.push(m);
    m = m === 1 ? 12 : m - 1;
  }
  return out;
}

/**
 * Resolves the raster URL for a month-aware family.
 * - Tries monthly assets in backward civil order until an onboarded month matches.
 * - If `onboardedMonths` is omitted, all twelve indices are considered onboarded
 *   (use only for a complete shipped family, or set explicit `onboardedMonths`).
 * - If there are no monthly assets (`onboardedMonths` is empty), uses `familyBaseSrc`.
 * - If `familyBaseSrc` is empty, returns `""` so the caller can apply legacy / global fallbacks.
 */
export function resolveMonthOfYearRasterSrc(
  family: MonthOfYearFamilyPaths,
  targetMonth1To12: number,
): string {
  const explicit = family.onboardedMonths;
  const hasMonthly = explicit === undefined || explicit.length > 0;
  const onboarded =
    explicit === undefined
      ? new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
      : new Set(explicit);

  if (hasMonthly && onboarded.size > 0) {
    for (const m of monthNumbersToTryBackwardsCivil(targetMonth1To12)) {
      if (onboarded.has(m)) {
        return family.monthAssetSrcs[m - 1]!;
      }
    }
  }

  const base = family.familyBaseSrc.trim();
  if (base !== "") {
    return family.familyBaseSrc;
  }
  return "";
}
