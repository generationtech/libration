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
 * Reference cities offered for top-band anchor `fixedCity` mode (Phase 3e).
 * Uses the app’s {@link REFERENCE_CITIES} dataset — longitude-only semantics for the tape.
 */
import { REFERENCE_CITIES } from "../../data/referenceCities";

export type AnchorReferenceCityOption = {
  id: string;
  label: string;
};

export const CURATED_ANCHOR_REFERENCE_CITY_OPTIONS: readonly AnchorReferenceCityOption[] =
  REFERENCE_CITIES.map((c) => ({ id: c.id, label: c.name }));

const KNOWN_IDS = new Set(REFERENCE_CITIES.map((c) => c.id));

/** Select options: curated list, plus current id if it is not in the dataset (survives normalization). */
export function anchorCitySelectOptions(currentCityId: string): readonly AnchorReferenceCityOption[] {
  if (KNOWN_IDS.has(currentCityId)) {
    return CURATED_ANCHOR_REFERENCE_CITY_OPTIONS;
  }
  return [{ id: currentCityId, label: currentCityId }, ...CURATED_ANCHOR_REFERENCE_CITY_OPTIONS];
}
