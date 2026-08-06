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
 * Upstream Model A cloud participation policy: maps prepared cloud opacity + SceneConfig
 * presentation into a bounded solar-transmittance attenuation contribution for the
 * planetary illumination field. Raster sampling and RenderPlan stay outside this module.
 * @see docs/specs/scene/weather-cloud-composition-plan.md (Model A)
 */

export type CloudParticipationPresentationMode =
  | "off"
  | "natural"
  | "enhanced"
  | "illustrative";

export interface CloudParticipationPolicy {
  readonly mode: CloudParticipationPresentationMode;
  /** When false, cloud opacity does not modulate illumination (deterministic zero). */
  readonly contributesCloudAttenuation: boolean;
  /** Scales opacity before final clamp to 0..1. */
  readonly attenuationGain: number;
}

const OFF: CloudParticipationPolicy = {
  mode: "off",
  contributesCloudAttenuation: false,
  attenuationGain: 0,
};

/** Subtle transmittance reduction for IR-brightness–class fields. */
const NATURAL: CloudParticipationPolicy = {
  mode: "natural",
  contributesCloudAttenuation: true,
  attenuationGain: 0.55,
};

const ENHANCED: CloudParticipationPolicy = {
  mode: "enhanced",
  contributesCloudAttenuation: true,
  attenuationGain: 0.85,
};

/** Teaching / comparison emphasis — still bounded in the illumination sampler. */
const ILLUSTRATIVE: CloudParticipationPolicy = {
  mode: "illustrative",
  contributesCloudAttenuation: true,
  attenuationGain: 1.15,
};

const POLICIES: Record<CloudParticipationPresentationMode, CloudParticipationPolicy> = {
  off: OFF,
  natural: NATURAL,
  enhanced: ENHANCED,
  illustrative: ILLUSTRATIVE,
};

export function getCloudParticipationPolicy(
  mode: CloudParticipationPresentationMode,
): CloudParticipationPolicy {
  return POLICIES[mode];
}

export function isCloudParticipationPresentationMode(
  x: unknown,
): x is CloudParticipationPresentationMode {
  return x === "off" || x === "natural" || x === "enhanced" || x === "illustrative";
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) {
    return 0;
  }
  return Math.max(0, Math.min(1, x));
}

/** Scene-normalized user intensity; clamped defensively for composition math. */
const PRESENTATION_INTENSITY_MIN = 0;
const PRESENTATION_INTENSITY_MAX = 2;

function clampPresentationIntensity(n: number | undefined): number {
  if (n === undefined) {
    return 1;
  }
  if (!Number.isFinite(n)) {
    return 1;
  }
  return Math.max(PRESENTATION_INTENSITY_MIN, Math.min(PRESENTATION_INTENSITY_MAX, n));
}

/**
 * Bounded 0..1 solar-transmittance attenuation from a prepared cloud opacity sample.
 * Deterministic given opacity, mode, and presentation intensity — no I/O.
 */
export function computeCloudSolarAttenuation01(input: {
  opacity01: number;
  mode: CloudParticipationPresentationMode;
  presentationIntensity?: number;
}): number {
  const policy = getCloudParticipationPolicy(input.mode);
  if (!policy.contributesCloudAttenuation) {
    return 0;
  }
  const opacity = clamp01(input.opacity01);
  if (opacity <= 0) {
    return 0;
  }
  const intensity = clampPresentationIntensity(input.presentationIntensity);
  return clamp01(opacity * policy.attenuationGain * intensity);
}
