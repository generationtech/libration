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
  computeCloudSolarAttenuation01,
  getCloudParticipationPolicy,
  isCloudParticipationPresentationMode,
} from "./cloudParticipationPolicy";

describe("cloudParticipationPolicy", () => {
  it("recognizes presentation modes", () => {
    expect(isCloudParticipationPresentationMode("off")).toBe(true);
    expect(isCloudParticipationPresentationMode("natural")).toBe(true);
    expect(isCloudParticipationPresentationMode("enhanced")).toBe(true);
    expect(isCloudParticipationPresentationMode("illustrative")).toBe(true);
    expect(isCloudParticipationPresentationMode("bogus")).toBe(false);
  });

  it("off policy contributes zero attenuation", () => {
    expect(getCloudParticipationPolicy("off").contributesCloudAttenuation).toBe(false);
    expect(
      computeCloudSolarAttenuation01({ opacity01: 1, mode: "off", presentationIntensity: 2 }),
    ).toBe(0);
  });

  it("scales opacity by mode gain and intensity, clamped to 0..1", () => {
    const natural = computeCloudSolarAttenuation01({
      opacity01: 1,
      mode: "natural",
      presentationIntensity: 1,
    });
    const enhanced = computeCloudSolarAttenuation01({
      opacity01: 1,
      mode: "enhanced",
      presentationIntensity: 1,
    });
    const illustrative = computeCloudSolarAttenuation01({
      opacity01: 1,
      mode: "illustrative",
      presentationIntensity: 1,
    });
    expect(natural).toBeCloseTo(0.55, 5);
    expect(enhanced).toBeGreaterThan(natural);
    expect(illustrative).toBe(1); // 1.15 → clamp
    expect(
      computeCloudSolarAttenuation01({
        opacity01: 0.5,
        mode: "natural",
        presentationIntensity: 2,
      }),
    ).toBeCloseTo(0.55, 5);
  });

  it("treats non-finite opacity / intensity defensively", () => {
    expect(
      computeCloudSolarAttenuation01({
        opacity01: Number.NaN,
        mode: "natural",
      }),
    ).toBe(0);
    expect(
      computeCloudSolarAttenuation01({
        opacity01: 1,
        mode: "natural",
        presentationIntensity: Number.NaN,
      }),
    ).toBeCloseTo(0.55, 5);
  });
});
