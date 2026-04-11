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
 * Small static reference set for fixed location overlays (no live data).
 * Coordinates are WGS84 degrees.
 */
export interface ReferenceCity {
  id: string;
  /** Short display label for the map. */
  name: string;
  /** IANA timezone for local wall time (no custom DST rules in app code). */
  timeZone: string;
  latitude: number;
  longitude: number;
}

export const REFERENCE_CITIES: readonly ReferenceCity[] = [
  {
    id: "city.london",
    name: "London",
    timeZone: "Europe/London",
    latitude: 51.5074,
    longitude: -0.1278,
  },
  {
    id: "city.nyc",
    name: "New York",
    timeZone: "America/New_York",
    latitude: 40.7128,
    longitude: -74.006,
  },
  {
    id: "city.knoxville",
    name: "Knoxville",
    timeZone: "America/New_York",
    latitude: 35.9606,
    longitude: -83.9207,
  },  
  {
    id: "city.tokyo",
    name: "Tokyo",
    timeZone: "Asia/Tokyo",
    latitude: 35.6762,
    longitude: 139.6503,
  },
  {
    id: "city.sydney",
    name: "Sydney",
    timeZone: "Australia/Sydney",
    latitude: -33.8688,
    longitude: 151.2093,
  },
  {
    id: "city.sao_paulo",
    name: "São Paulo",
    timeZone: "America/Sao_Paulo",
    latitude: -23.5505,
    longitude: -46.6333,
  },
  {
    id: "city.cairo",
    name: "Cairo",
    timeZone: "Africa/Cairo",
    latitude: 30.0444,
    longitude: 31.2357,
  },
  {
    id: "city.mumbai",
    name: "Mumbai",
    timeZone: "Asia/Kolkata",
    latitude: 19.076,
    longitude: 72.8777,
  },
  {
    id: "city.los_angeles",
    name: "Los Angeles",
    timeZone: "America/Los_Angeles",
    latitude: 34.0522,
    longitude: -118.2437,
  },
] as const;
