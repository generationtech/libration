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
import { getMoonlightPolicy } from "./moonlightPolicy";

describe("getMoonlightPolicy", () => {
  it("turns off composition for off mode", () => {
    const p = getMoonlightPolicy("off");
    expect(p.contributesMoonlight).toBe(false);
    expect(p.secondaryTransmittanceLiftMax).toBe(0);
    expect(p.secondaryCoolIntensity).toBe(0);
  });

  it("keeps illustrative coefficients aligned with historical product tuning", () => {
    const p = getMoonlightPolicy("illustrative");
    expect(p.secondaryTransmittanceLiftMax).toBe(0.26);
    expect(p.secondaryCoolIntensity).toBe(1);
    expect(p.coolTintB).toBe(112);
    expect(p.incidenceBroadWeight).toBe(0.66);
    expect(p.incidenceFocusPower).toBe(1.5);
  });
});
