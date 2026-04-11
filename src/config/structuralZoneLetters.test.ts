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

import { describe, expect, it } from "vitest";
import {
  CANONICAL_MILITARY_ZONE_LETTERS_WEST_TO_EAST,
  CANONICAL_MILITARY_ZONE_LETTER_COUNT,
  STRUCTURAL_ZONE_COLUMN_COUNT,
  STRUCTURAL_ZONE_LETTERS_WEST_TO_EAST,
  canonicalMilitaryZoneIndexFromLetter,
  structuralZoneLetterFromIndex,
  visibleTimezoneStripLabelsWestToEast,
} from "./structuralZoneLetters";

/** Libration structural west→east order (J omitted; Y not used). */
const LOCKED_CANONICAL =
  "M X W V U T S R Q P O N Z A B C D E F G H I K L";

describe("CANONICAL_MILITARY_ZONE_LETTERS_WEST_TO_EAST", () => {
  it("has length 24 (J omitted; Y not used)", () => {
    expect(CANONICAL_MILITARY_ZONE_LETTER_COUNT).toBe(24);
    expect(STRUCTURAL_ZONE_LETTERS_WEST_TO_EAST.length).toBe(24);
    expect([...CANONICAL_MILITARY_ZONE_LETTERS_WEST_TO_EAST].join("")).not.toContain("J");
    expect([...CANONICAL_MILITARY_ZONE_LETTERS_WEST_TO_EAST].join("")).not.toContain("Y");
    expect([...CANONICAL_MILITARY_ZONE_LETTERS_WEST_TO_EAST].join("")).toContain("M");
  });

  it("matches the exact west→east Libration structural ring (J omitted; Y not used)", () => {
    expect([...CANONICAL_MILITARY_ZONE_LETTERS_WEST_TO_EAST].join(" ")).toBe(LOCKED_CANONICAL);
  });

  it("aliases STRUCTURAL_ZONE_LETTERS_WEST_TO_EAST to the same canonical ring", () => {
    expect(STRUCTURAL_ZONE_LETTERS_WEST_TO_EAST).toBe(
      CANONICAL_MILITARY_ZONE_LETTERS_WEST_TO_EAST,
    );
  });

  it("includes L — no arbitrary omission", () => {
    expect(CANONICAL_MILITARY_ZONE_LETTERS_WEST_TO_EAST.includes("L")).toBe(true);
  });

  it("maps letters to stable canonical indices", () => {
    expect(canonicalMilitaryZoneIndexFromLetter("M")).toBe(0);
    expect(canonicalMilitaryZoneIndexFromLetter("Z")).toBe(12);
    expect(canonicalMilitaryZoneIndexFromLetter("L")).toBe(23);
    expect(canonicalMilitaryZoneIndexFromLetter("Y")).toBe(-1);
    expect(canonicalMilitaryZoneIndexFromLetter("?")).toBe(-1);
  });
});

describe("fixed structural column → letter", () => {
  it("produces 24 strip labels with no stripStartIndex / rotating window", () => {
    expect(STRUCTURAL_ZONE_COLUMN_COUNT).toBe(24);
    expect(visibleTimezoneStripLabelsWestToEast()).toHaveLength(24);
  });

  it("matches canonical indices 0…23 (west-edge sector letters)", () => {
    const strip = visibleTimezoneStripLabelsWestToEast();
    for (let h = 0; h < 24; h += 1) {
      expect(structuralZoneLetterFromIndex(h)).toBe(CANONICAL_MILITARY_ZONE_LETTERS_WEST_TO_EAST[h]);
      expect(strip[h]).toBe(CANONICAL_MILITARY_ZONE_LETTERS_WEST_TO_EAST[h]);
    }
  });

  it("places Z on column 12 (west edge 0° — Greenwich / UTC sector start)", () => {
    expect(structuralZoneLetterFromIndex(12)).toBe("Z");
  });

  it("maps west and east sectors to expected letters", () => {
    expect(structuralZoneLetterFromIndex(0)).toBe("M");
    expect(structuralZoneLetterFromIndex(11)).toBe("N");
    expect(structuralZoneLetterFromIndex(13)).toBe("A");
    expect(structuralZoneLetterFromIndex(23)).toBe("L");
  });

  it("clamps out-of-range structural indices for defensive callers (wraps to column band 0…23)", () => {
    expect(structuralZoneLetterFromIndex(-1)).toBe("M");
    expect(structuralZoneLetterFromIndex(99)).toBe("L");
  });
});
