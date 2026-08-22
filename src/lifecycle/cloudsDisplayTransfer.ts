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
 * DEV-only Clouds display-transfer override. Production always uses wx5.
 * The URL parser lives in `src/dev/visualScenarios.ts` so `cloudsTransfer=`
 * does not ship in the production bundle. This module only holds the process
 * flag the DEV hatch sets.
 */

export const CLOUDS_DISPLAY_TRANSFER_IDS = [
  "wx5",
  "legacy",
  "canonicalIR",
  "gibsGrayPath",
] as const;

export type CloudsDisplayTransferId = (typeof CLOUDS_DISPLAY_TRANSFER_IDS)[number];

export const PRODUCTION_CLOUDS_DISPLAY_TRANSFER_ID: CloudsDisplayTransferId = "wx5";

let devOverride: CloudsDisplayTransferId | null = null;

export function setDevCloudsDisplayTransferOverride(
  id: CloudsDisplayTransferId | null,
): void {
  devOverride = id;
}

export function getActiveCloudsDisplayTransferId(): CloudsDisplayTransferId {
  return devOverride ?? PRODUCTION_CLOUDS_DISPLAY_TRANSFER_ID;
}

export function parseCloudsDisplayTransferId(
  raw: string | null | undefined,
): CloudsDisplayTransferId | null {
  if (raw == null || raw === "") return null;
  const v = raw.trim();
  if (v === "wx5" || v === "wx5-cloud-v2" || v === "wx54-gibs-gray-v3") return "wx5";
  if (v === "legacy" || v === "wx3" || v === "wx3-ir-v1") return "legacy";
  if (v === "canonicalIR" || v === "canonical" || v === "ir") return "canonicalIR";
  if (v === "gibsGrayPath" || v === "gibsgray" || v === "graypath") return "gibsGrayPath";
  return null;
}
