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
 * Upstream moonlight presentation policy: composition weights and sampling coefficients only.
 * Ephemeris and solar twilight models stay outside this table.
 */

export type MoonlightPresentationMode = "off" | "natural" | "enhanced" | "illustrative";

export interface MoonlightPolicy {
  readonly mode: MoonlightPresentationMode;
  /** When false, illumination skips moonlight composition entirely (deterministic zero). */
  readonly contributesMoonlight: boolean;
  /** Straight-alpha transmittance relief on the night mask, upper cap (0–1 scale). */
  readonly secondaryTransmittanceLiftMax: number;
  /** Scales visibility into additive cool RGB (0–1). */
  readonly secondaryCoolIntensity: number;
  readonly coolTintR: number;
  readonly coolTintG: number;
  readonly coolTintB: number;
  /** Blends broad vs focused incidence response (see {@link moonIncidenceStrength}). */
  readonly incidenceBroadWeight: number;
  readonly incidenceFocusPower: number;
  readonly incidenceSoftRampPower: number;
}

const ILLUSTRATIVE: MoonlightPolicy = {
  mode: "illustrative",
  contributesMoonlight: true,
  secondaryTransmittanceLiftMax: 0.26,
  secondaryCoolIntensity: 1,
  coolTintR: 28,
  coolTintG: 52,
  coolTintB: 112,
  incidenceBroadWeight: 0.66,
  incidenceFocusPower: 1.5,
  incidenceSoftRampPower: 0.88,
};

const ENHANCED: MoonlightPolicy = {
  mode: "enhanced",
  contributesMoonlight: true,
  secondaryTransmittanceLiftMax: 0.17,
  secondaryCoolIntensity: 0.68,
  coolTintR: 19,
  coolTintG: 35,
  coolTintB: 76,
  incidenceBroadWeight: 0.6,
  incidenceFocusPower: 1.72,
  incidenceSoftRampPower: 0.9,
};

const NATURAL: MoonlightPolicy = {
  mode: "natural",
  contributesMoonlight: true,
  secondaryTransmittanceLiftMax: 0.08,
  secondaryCoolIntensity: 0.35,
  coolTintR: 10,
  coolTintG: 18,
  coolTintB: 39,
  incidenceBroadWeight: 0.52,
  incidenceFocusPower: 2,
  incidenceSoftRampPower: 0.92,
};

const OFF: MoonlightPolicy = {
  mode: "off",
  contributesMoonlight: false,
  secondaryTransmittanceLiftMax: 0,
  secondaryCoolIntensity: 0,
  coolTintR: 0,
  coolTintG: 0,
  coolTintB: 0,
  incidenceBroadWeight: ILLUSTRATIVE.incidenceBroadWeight,
  incidenceFocusPower: ILLUSTRATIVE.incidenceFocusPower,
  incidenceSoftRampPower: ILLUSTRATIVE.incidenceSoftRampPower,
};

const POLICIES: Record<MoonlightPresentationMode, MoonlightPolicy> = {
  off: OFF,
  natural: NATURAL,
  enhanced: ENHANCED,
  illustrative: ILLUSTRATIVE,
};

export function getMoonlightPolicy(mode: MoonlightPresentationMode): MoonlightPolicy {
  return POLICIES[mode];
}

export function isMoonlightPresentationMode(x: unknown): x is MoonlightPresentationMode {
  return x === "off" || x === "natural" || x === "enhanced" || x === "illustrative";
}
