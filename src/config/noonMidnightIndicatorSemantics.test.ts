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
  indicatorEntryNoonMidnightRole,
  noonMidnightActiveIntent,
  resolveIndicatorEntryDiskDisplayLabel,
} from "./noonMidnightIndicatorSemantics.ts";

describe("indicatorEntryNoonMidnightRole", () => {
  it("maps structural hours 0 and 12", () => {
    expect(indicatorEntryNoonMidnightRole(0)).toBe("midnight");
    expect(indicatorEntryNoonMidnightRole(12)).toBe("noon");
    expect(indicatorEntryNoonMidnightRole(11)).toBe("none");
    expect(indicatorEntryNoonMidnightRole(13)).toBe("none");
  });
});

describe("noonMidnightActiveIntent", () => {
  it("is inactive when customization disabled", () => {
    expect(noonMidnightActiveIntent({ enabled: false }, 12)).toEqual({ active: false });
  });

  it("is inactive for ordinary hours when enabled", () => {
    expect(
      noonMidnightActiveIntent({ enabled: true, expressionMode: "textWords" }, 7),
    ).toEqual({ active: false });
  });

  it("is active for noon/midnight when enabled", () => {
    expect(noonMidnightActiveIntent({ enabled: true, expressionMode: "boxedNumber" }, 12)).toEqual({
      active: true,
      role: "noon",
      expressionMode: "boxedNumber",
    });
  });
});

describe("resolveIndicatorEntryDiskDisplayLabel", () => {
  it("passes through tape labels when disabled", () => {
    expect(resolveIndicatorEntryDiskDisplayLabel("12", 12, { enabled: false })).toBe("12");
  });

  it("substitutes words in textWords mode", () => {
    expect(
      resolveIndicatorEntryDiskDisplayLabel("12", 12, { enabled: true, expressionMode: "textWords" }),
    ).toBe("NOON");
    expect(
      resolveIndicatorEntryDiskDisplayLabel("00", 0, { enabled: true, expressionMode: "textWords" }),
    ).toBe("MIDNIGHT");
  });

  it("keeps tape label for non-text modes", () => {
    expect(
      resolveIndicatorEntryDiskDisplayLabel("12", 12, { enabled: true, expressionMode: "semanticGlyph" }),
    ).toBe("12");
  });
});
