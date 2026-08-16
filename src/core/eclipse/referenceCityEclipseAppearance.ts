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

export const DEFAULT_REFERENCE_CITY_ECLIPSE_DETAILS_ENABLED = true;
export const DEFAULT_REFERENCE_CITY_ECLIPSE_CHROME_ENABLED = true;

export type ReferenceCityEclipsePresentation = {
  readonly detailsEnabled: boolean;
  readonly chromeStatusEnabled: boolean;
};

function flag(raw: unknown, fallback: boolean): boolean {
  if (raw === undefined) {
    return fallback;
  }
  return raw === true;
}

export function normalizeReferenceCityEclipsePresentation(
  raw: Readonly<Record<string, unknown>> | undefined,
): ReferenceCityEclipsePresentation {
  return {
    detailsEnabled: flag(raw?.detailsEnabled, DEFAULT_REFERENCE_CITY_ECLIPSE_DETAILS_ENABLED),
    chromeStatusEnabled: flag(
      raw?.chromeStatusEnabled,
      DEFAULT_REFERENCE_CITY_ECLIPSE_CHROME_ENABLED,
    ),
  };
}
