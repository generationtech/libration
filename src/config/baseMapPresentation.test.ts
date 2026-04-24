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
import { getEquirectBaseMapCatalogEntry } from "./baseMapAssetResolve";
import {
  DEFAULT_BASE_MAP_PRESENTATION,
  baseMapPresentationToCssFilterString,
  normalizeBaseMapPresentation,
  resolveEffectiveBaseMapPresentation,
} from "./baseMapPresentation";

describe("baseMapPresentation", () => {
  it("defaults to identity (no filter), preserving prior map appearance", () => {
    const d = normalizeBaseMapPresentation(undefined);
    expect(d).toEqual(DEFAULT_BASE_MAP_PRESENTATION);
    expect(baseMapPresentationToCssFilterString(d)).toBeUndefined();
  });

  it("clamps out-of-range values", () => {
    const n = normalizeBaseMapPresentation({
      brightness: 0,
      contrast: 9,
      gamma: -1,
      saturation: 5,
    });
    expect(n.brightness).toBe(0.5);
    expect(n.contrast).toBe(2);
    expect(n.gamma).toBe(0.5);
    expect(n.saturation).toBe(2);
  });

  it("omits gamma from the CSS filter string (gamma uses the canvas imageBlit pixel pass instead)", () => {
    const onlyGamma = normalizeBaseMapPresentation({ gamma: 1.4 });
    expect(onlyGamma.gamma).toBe(1.4);
    expect(baseMapPresentationToCssFilterString(onlyGamma)).toBeUndefined();
  });

  it("resolveEffectiveBaseMapPresentation uses catalog defaults then scene overrides", () => {
    const entry = getEquirectBaseMapCatalogEntry("equirect-world-legacy-v1");
    const a = resolveEffectiveBaseMapPresentation(entry, {});
    expect(a.opacity).toBe(1);
    expect(a.brightness).toBe(1);

    const b = resolveEffectiveBaseMapPresentation(entry, { opacity: 0.5, presentation: { contrast: 1.5 } });
    expect(b.opacity).toBe(0.5);
    expect(b.contrast).toBe(1.5);
  });

  it("emits filter parts for non-default brightness, contrast, and saturation", () => {
    const s = baseMapPresentationToCssFilterString(
      normalizeBaseMapPresentation({
        brightness: 1.2,
        contrast: 0.9,
        saturation: 0.5,
        gamma: 1,
      }),
    );
    expect(s).toBe("brightness(1.2) contrast(0.9) saturate(0.5)");
  });
});
