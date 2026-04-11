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
 * **Canonical** Libration structural NATO letter sequence (west → east): **J (Juliett) omitted**, **Y (Yankee) not used** —
 * 24 named one-hour zones (matches the physical chart; west −12h uses **M**, not Y).
 * Single source of truth for **letter order** and **which letters exist**.
 *
 * The top chrome draws **24** structural columns (−180°…+180° in 15° sectors). Each column `h` ∈ [0, 23] is labeled with
 * the NATO letter for **mean solar UTC offset** at that column’s **west edge** longitude −180° + 15°·`h` — i.e. the same
 * rule as `militaryTimeZoneLetterFromLongitudeDeg` in `src/renderer/displayChrome.ts` at `lon0` (not anchor-dependent).
 * Labels are **fixed** to those sectors; the longitude anchor affects **tape/time** placement only, not strip letters.
 * **J** is omitted from the alphabet; apparent letter repetition at wrapped map edges is a **projection/wrap** artifact, not a
 * second sequence or rotating window.
 *
 * Civil IANA timezones do **not** drive these letters; longitude **sector** semantics stay separate from civil wall-clock
 * grouping.
 */
export const CANONICAL_MILITARY_ZONE_LETTERS_WEST_TO_EAST = [
  "M",
  "X",
  "W",
  "V",
  "U",
  "T",
  "S",
  "R",
  "Q",
  "P",
  "O",
  "N",
  "Z",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "K",
  "L",
] as const;

/** Length of {@link CANONICAL_MILITARY_ZONE_LETTERS_WEST_TO_EAST} (24; J omitted, Y not used). */
export const CANONICAL_MILITARY_ZONE_LETTER_COUNT =
  CANONICAL_MILITARY_ZONE_LETTERS_WEST_TO_EAST.length;

/**
 * Retained name for the canonical ring — same letters as {@link CANONICAL_MILITARY_ZONE_LETTERS_WEST_TO_EAST}.
 * Prefer the `CANONICAL` identifier for new code.
 */
export const STRUCTURAL_ZONE_LETTERS_WEST_TO_EAST = CANONICAL_MILITARY_ZONE_LETTERS_WEST_TO_EAST;

/** Number of equal longitude columns on the top strip (24); equals {@link CANONICAL_MILITARY_ZONE_LETTER_COUNT}. */
export const STRUCTURAL_ZONE_COLUMN_COUNT = 24;

if (CANONICAL_MILITARY_ZONE_LETTER_COUNT !== 24) {
  throw new Error("Canonical military zone ring must contain exactly 24 letters (J omitted, Y not used)");
}

const LETTER_TO_CANONICAL_INDEX: ReadonlyMap<string, number> = new Map(
  CANONICAL_MILITARY_ZONE_LETTERS_WEST_TO_EAST.map((L, i) => [L, i]),
);

/**
 * Index of a military-zone letter on the canonical west→east ring (`0…23`), or `-1` if unknown.
 */
export function canonicalMilitaryZoneIndexFromLetter(letter: string): number {
  return LETTER_TO_CANONICAL_INDEX.get(letter) ?? -1;
}

/**
 * NATO letter for structural column `structuralHourIndex` (`0…23`, west→east): {@link CANONICAL_MILITARY_ZONE_LETTERS_WEST_TO_EAST}[`h`]
 * for clamped `h`. This matches `militaryTimeZoneLetterFromLongitudeDeg`(−180° + 15°·`h`) in `displayChrome.ts` for `h` ∈ [0, 23].
 */
export function structuralZoneLetterFromIndex(structuralHourIndex: number): string {
  const h = Math.max(0, Math.min(STRUCTURAL_ZONE_COLUMN_COUNT - 1, Math.floor(structuralHourIndex)));
  return CANONICAL_MILITARY_ZONE_LETTERS_WEST_TO_EAST[h]!;
}

/**
 * The 24 visible west→east tab letters (fixed sector mapping; tests / diagnostics).
 */
export function visibleTimezoneStripLabelsWestToEast(): readonly string[] {
  return Array.from({ length: STRUCTURAL_ZONE_COLUMN_COUNT }, (_, h) => structuralZoneLetterFromIndex(h));
}
