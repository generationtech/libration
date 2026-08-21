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
 * DEV-only Clouds presentation visual fixture. Production never imports this
 * module. Recorded IR-derived PNG at a documented UTC so Layers → Weather can
 * be exercised without GIBS. Origin is fixture; never labeled live.
 */

import { applyCloudHighlightTransfer } from "../lifecycle/cloudHighlightTransfer";
import { CLOUDS_COVERAGE_NOTE } from "../lifecycle/cloudProvenance";
import { decodeCloudsPngRgba, encodeRgbaPng } from "../lifecycle/cloudsPng";
import type { PreparedEquirectRasterView } from "../lifecycle/dynamicEquirectMaterializer";
import { GLOBAL_CLOUDS_IR_SOURCE_ID } from "../lifecycle/dynamicEquirectSourceCatalog";
import { produceGlobalCloudsIrFixtureAcquisition } from "../lifecycle/globalCloudsIrAcquisition";

/** Frozen mosaic TIME for the DEV Clouds scenario. */
export const CLOUDS_PRESENTATION_SCENARIO_UTC = "2026-08-21T20:40:00.000Z";

function bytesToDataUrl(bytes: Uint8Array, contentType: string): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode(...slice);
  }
  const b64 =
    typeof globalThis.btoa === "function"
      ? globalThis.btoa(binary)
      : Buffer.from(bytes).toString("base64");
  return `data:${contentType};base64,${b64}`;
}

export function buildCloudsPresentationPreparedEquirectView(): PreparedEquirectRasterView {
  const observationTimeMs = Date.parse(CLOUDS_PRESENTATION_SCENARIO_UTC);
  const result = produceGlobalCloudsIrFixtureAcquisition({
    nowMs: () => observationTimeMs,
    observationTimeMs,
    versionIdFor: () => "clouds-presentation-dev",
  });
  if (!result.ok || result.entry.payloadBytes === undefined) {
    throw new Error("clouds scenario: failed to build fixture PNG");
  }
  const decoded = decodeCloudsPngRgba(result.entry.payloadBytes);
  if (decoded === null) {
    throw new Error("clouds scenario: fixture PNG decode failed");
  }
  const highlight = applyCloudHighlightTransfer(decoded.rgba);
  const encoded = encodeRgbaPng(decoded.width, decoded.height, highlight);
  const bytes = encoded ?? result.entry.payloadBytes;
  const meta = result.entry.record.meta;
  return {
    sourceId: GLOBAL_CLOUDS_IR_SOURCE_ID,
    versionId: meta.versionId,
    src: bytesToDataUrl(bytes, "image/png"),
    validTimeMs: meta.validTimeMs,
    acquiredAtMs: meta.acquiredAtMs,
    freshness: "ready",
    contentType: "image/png",
    origin: "fixture",
    coverageKind: "partial",
    coverageNote: CLOUDS_COVERAGE_NOTE,
    devAllowFixturePaint: true,
    ...(meta.attribution !== undefined ? { attribution: meta.attribution } : {}),
    ...(meta.licenseNote !== undefined ? { licenseNote: meta.licenseNote } : {}),
  };
}
