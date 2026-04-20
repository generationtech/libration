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

import { formatPinDateTimeLabel } from "../core/pinDateTimeDisplayFormat";
import type { ReferenceCity } from "../data/referenceCities";
import type { FontAssetId } from "../typography/fontAssetTypes";
import type { Layer, LayerState, TimeContext, UpdatePolicy } from "./types";
import {
  CITY_PINS_KIND,
  type CityPinEntry,
  type CityPinsPayload,
  type CityPinsPresentationOptions,
} from "./cityPinsPayload";

const CITY_PINS_LAYER_ID = "layer.points.referenceCities";

const updatePolicy: UpdatePolicy = { type: "perFrame" };

type ResolvedPinDef =
  | {
      kind: "reference";
      id: string;
      name: string;
      timeZone: string;
      latDeg: number;
      lonDeg: number;
    }
  | { kind: "custom"; id: string; name: string; latDeg: number; lonDeg: number };

function resolvePinDefinitions(
  cities: readonly ReferenceCity[],
  customPins: readonly CityPinsCustomDefinition[],
): ResolvedPinDef[] {
  const ref: ResolvedPinDef[] = cities.map((c) => ({
    kind: "reference",
    id: c.id,
    name: c.name,
    timeZone: c.timeZone,
    latDeg: c.latitude,
    lonDeg: c.longitude,
  }));
  const custom: ResolvedPinDef[] = customPins.map((p) => ({
    kind: "custom",
    id: p.id,
    name: p.label,
    latDeg: p.latitude,
    lonDeg: p.longitude,
  }));
  return [...ref, ...custom];
}

export type CityPinsCustomDefinition = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
};

/**
 * Static reference city markers in equirectangular space (no live data, no interaction).
 * Pass the city list from app/bootstrap; resolved city-name and date/time fonts come from product policy
 * (local overrides else global default).
 * Optional `customPins` are merged after reference cities (same draw payload shape; no local time).
 */
export function createCityPinsLayer(
  cities: readonly ReferenceCity[],
  customPins: readonly CityPinsCustomDefinition[] = [],
  presentation: CityPinsPresentationOptions,
  cityNameFontAssetId: FontAssetId,
  dateTimeFontAssetId: FontAssetId,
): Layer {
  const pinDefinitions = resolvePinDefinitions(cities, customPins);
  return {
    id: CITY_PINS_LAYER_ID,
    name: "Reference cities",
    enabled: true,
    /** Above map, shading, and grid; below clock text overlays. */
    zIndex: 12,
    type: "points",
    updatePolicy,
    getState(time: TimeContext): LayerState {
      const cities: CityPinEntry[] = pinDefinitions.map((c) => ({
        id: c.id,
        name: c.name,
        latDeg: c.latDeg,
        lonDeg: c.lonDeg,
        localTimeLabel:
          c.kind === "custom"
            ? ""
            : formatPinDateTimeLabel(
                time.now,
                c.timeZone,
                presentation.pinDateTimeDisplayMode,
                presentation.displayTimeMode,
              ),
      }));
      const data: CityPinsPayload = {
        kind: CITY_PINS_KIND,
        cities,
        showLabels: presentation.showLabels,
        labelMode: presentation.labelMode,
        scale: presentation.scale,
        cityNameFontAssetId,
        dateTimeFontAssetId,
      };
      return {
        visible: true,
        opacity: 1,
        data,
      };
    },
  };
}
