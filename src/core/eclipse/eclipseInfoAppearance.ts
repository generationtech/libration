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

export const DEFAULT_ECLIPSE_LABELS_ENABLED = true;
export const DEFAULT_ECLIPSE_EVENT_INFORMATION_ENABLED = true;

export type EclipseInfoPresentation = {
  readonly labelsEnabled: boolean;
  readonly eventInformationEnabled: boolean;
};

function flag(raw: unknown, fallback: boolean): boolean {
  if (raw === undefined) {
    return fallback;
  }
  return raw === true;
}

export function normalizeEclipseInfoPresentation(
  raw: Readonly<Record<string, unknown>> | undefined,
): EclipseInfoPresentation {
  return {
    labelsEnabled: flag(raw?.labelsEnabled, DEFAULT_ECLIPSE_LABELS_ENABLED),
    eventInformationEnabled: flag(
      raw?.eventInformationEnabled,
      DEFAULT_ECLIPSE_EVENT_INFORMATION_ENABLED,
    ),
  };
}
