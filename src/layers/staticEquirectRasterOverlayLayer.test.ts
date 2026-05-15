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
import { createStaticEquirectRasterOverlayLayer } from "./staticEquirectRasterOverlayLayer";
import { isEquirectangularRasterPayload } from "./rasterPayload";

const fakeFrame: OverlayReadabilityFrame = {
  globalNightVeil01: 0.5,
  globalEmissiveLegibilityPressure01: 0,
  globalReadabilityVeil01: 0.82,
  substrateOverlayReadabilityLiftScale01: 0.88,
  nightVeil01At: () => 0,
  readabilityVeil01At: () => 0,
};

describe("createStaticEquirectRasterOverlayLayer", () => {
  it("uses attached overlay readability frame when no pilot is set", () => {
    const layer = createStaticEquirectRasterOverlayLayer({
      sceneLayerId: "staticEquirectOverlay",
      src: "/maps/x.jpg",
    });
    const time = createTimeContext(Date.UTC(2020, 0, 1), 0, false, {
      overlayReadabilityFrame: fakeFrame,
    });
    const st = layer.getState(time);
    expect(isEquirectangularRasterPayload(st.data)).toBe(true);
    if (!isEquirectangularRasterPayload(st.data)) {
      return;
    }
    expect(st.data.readability?.nightVeil01).toBe(0.82);
    expect(st.data.readability?.overlayReadabilityLiftScale01).toBe(0.88);
  });

  it("applies static equirect pilot presentation after the shell frame", () => {
    const layer = createStaticEquirectRasterOverlayLayer({
      sceneLayerId: "staticEquirectOverlay",
      src: "/maps/x.jpg",
      staticEquirectOverlayReadabilityPresentation: {
        readabilityVeilScale01: 0.5,
        overlayLiftMultiplier01: 1,
      },
    });
    const time = createTimeContext(Date.UTC(2020, 0, 1), 0, false, {
      overlayReadabilityFrame: fakeFrame,
    });
    const st = layer.getState(time);
    expect(isEquirectangularRasterPayload(st.data)).toBe(true);
    if (!isEquirectangularRasterPayload(st.data)) {
      return;
    }
    expect(st.data.readability?.nightVeil01).toBeCloseTo(0.41, 5);
    expect(st.data.readability?.overlayReadabilityLiftScale01).toBeCloseTo(0.88, 5);
  });
});
