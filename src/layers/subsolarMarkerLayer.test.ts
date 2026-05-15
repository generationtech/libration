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
import { createTimeContext } from "../core/time";
import type { OverlayReadabilityFrame } from "../core/overlayReadabilityFrame";
import { createSubsolarMarkerLayer } from "./subsolarMarkerLayer";
import { isSubsolarMarkerPayload } from "./subsolarMarkerPayload";

const fakeFrame: OverlayReadabilityFrame = {
  globalNightVeil01: 0.5,
  globalEmissiveLegibilityPressure01: 0,
  globalReadabilityVeil01: 0.8,
  substrateOverlayReadabilityLiftScale01: 0.9,
  nightVeil01At: () => 0,
  readabilityVeil01At: (_latDeg, _lonDeg) => 0.6,
};

describe("createSubsolarMarkerLayer", () => {
  it("uses attached overlay readability frame when no pilot is set", () => {
    const layer = createSubsolarMarkerLayer({});
    const time = createTimeContext(Date.UTC(2020, 0, 1), 0, false, {
      overlayReadabilityFrame: fakeFrame,
    });
    const st = layer.getState(time);
    expect(isSubsolarMarkerPayload(st.data)).toBe(true);
    if (!isSubsolarMarkerPayload(st.data)) {
      return;
    }
    expect(st.data.readability?.nightVeil01).toBe(0.6);
    expect(st.data.readability?.overlayReadabilityLiftScale01).toBe(0.9);
  });

  it("applies subsolar marker pilot presentation after the shell frame", () => {
    const layer = createSubsolarMarkerLayer({
      subsolarMarkerReadabilityPresentation: { readabilityVeilScale01: 0.5, overlayLiftMultiplier01: 1 },
    });
    const time = createTimeContext(Date.UTC(2020, 0, 1), 0, false, {
      overlayReadabilityFrame: fakeFrame,
    });
    const st = layer.getState(time);
    expect(isSubsolarMarkerPayload(st.data)).toBe(true);
    if (!isSubsolarMarkerPayload(st.data)) {
      return;
    }
    expect(st.data.readability?.nightVeil01).toBeCloseTo(0.3, 5);
    expect(st.data.readability?.overlayReadabilityLiftScale01).toBeCloseTo(0.9, 5);
  });
});
