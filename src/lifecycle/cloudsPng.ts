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
 * PNG decode/encode and Clouds v1 payload sanity. Uses fast-png (no Node zlib).
 */

import { decode, encode, hasPngSignature } from "fast-png";
import {
  CLOUDS_GIBS_HEIGHT_PX,
  CLOUDS_GIBS_WIDTH_PX,
} from "./cloudsGibsWms";
import {
  CLOUDS_EUMET_HEIGHT_PX,
  CLOUDS_EUMET_WIDTH_PX,
} from "./cloudsEumetWms";

export const CLOUDS_PNG_MIN_USABLE_COVERAGE_RATIO = 0.05;
/** EUMET geostationary ring is ~87% opaque with polar holes; reject near-empty. */
export const CLOUDS_EUMET_MIN_USABLE_COVERAGE_RATIO = 0.7;
export const CLOUDS_EUMET_AFRICA_SAMPLE_LON_DEG = 20;
export const CLOUDS_EUMET_AFRICA_SAMPLE_LAT_DEG = 0;
export const CLOUDS_EUMET_EUROPE_SAMPLE_LON_DEG = 10;
export const CLOUDS_EUMET_EUROPE_SAMPLE_LAT_DEG = 50;

export type CloudsPngRgba = Readonly<{
  width: number;
  height: number;
  rgba: Uint8Array;
  opaqueRatio: number;
}>;

export type CloudsPngValidateOk = Readonly<{
  ok: true;
  width: number;
  height: number;
  opaqueRatio: number;
  byteLength: number;
}>;

export type CloudsPngValidateFail = Readonly<{
  ok: false;
  error: string;
}>;

export type CloudsPngValidateResult = CloudsPngValidateOk | CloudsPngValidateFail;

function looksLikeXmlOrHtml(bytes: Uint8Array): boolean {
  let i = 0;
  while (i < bytes.length && (bytes[i] === 0x20 || bytes[i] === 0x09 || bytes[i] === 0x0a || bytes[i] === 0x0d)) {
    i += 1;
  }
  if (i >= bytes.length) return false;
  return bytes[i] === 0x3c;
}

function toRgba8(
  data: Uint8Array | Uint8ClampedArray | Uint16Array,
  channels: number,
  pixelCount: number,
): Uint8Array | null {
  if (channels === 4 && data instanceof Uint8Array && data.length >= pixelCount * 4) {
    return data.length === pixelCount * 4 ? data : data.subarray(0, pixelCount * 4);
  }
  if (channels === 4 && data instanceof Uint8ClampedArray && data.length >= pixelCount * 4) {
    return new Uint8Array(data.buffer, data.byteOffset, pixelCount * 4);
  }
  return null;
}

export function opaquePixelRatio(rgba: Uint8Array): number {
  if (rgba.length < 4) return 0;
  const pixels = Math.floor(rgba.length / 4);
  if (pixels <= 0) return 0;
  let opaque = 0;
  for (let i = 3; i < rgba.length; i += 4) {
    if (rgba[i]! > 0) opaque += 1;
  }
  return opaque / pixels;
}

export function decodeCloudsPngRgba(bytes: Uint8Array): CloudsPngRgba | null {
  if (!hasPngSignature(bytes) || looksLikeXmlOrHtml(bytes)) {
    return null;
  }
  try {
    const decoded = decode(bytes);
    const { width, height, channels, data } = decoded;
    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0 ||
      channels !== 4
    ) {
      return null;
    }
    const rgba = toRgba8(data, channels, width * height);
    if (rgba === null) return null;
    return {
      width,
      height,
      rgba,
      opaqueRatio: opaquePixelRatio(rgba),
    };
  } catch {
    return null;
  }
}

export function encodeRgbaPng(
  width: number,
  height: number,
  rgba: Uint8Array,
): Uint8Array | null {
  if (width <= 0 || height <= 0 || rgba.length < width * height * 4) {
    return null;
  }
  try {
    return encode({
      width,
      height,
      data: rgba.subarray(0, width * height * 4),
      depth: 8,
      channels: 4,
    });
  } catch {
    return null;
  }
}

export function sampleEquirectRgbaAlpha(
  rgba: Uint8Array,
  width: number,
  height: number,
  lonDeg: number,
  latDeg: number,
): number | null {
  if (width <= 0 || height <= 0 || rgba.length < width * height * 4) return null;
  const x = Math.round(((lonDeg + 180) / 360) * (width - 1));
  const y = Math.round(((90 - latDeg) / 180) * (height - 1));
  if (x < 0 || y < 0 || x >= width || y >= height) return null;
  return rgba[(y * width + x) * 4 + 3] ?? null;
}

export type ValidateCloudsPngOptions = Readonly<{
  requireGibsDimensions?: boolean;
  requireEumetDimensions?: boolean;
  minCoverageRatio?: number;
  requireAfricaEuropeCoverage?: boolean;
}>;

/**
 * Reject service exceptions, JPEG, missing alpha, wrong size (when required),
 * and implausibly empty mosaics. Partial global coverage is accepted.
 */
export function validateCloudsPngBytes(
  bytes: Uint8Array,
  options: ValidateCloudsPngOptions = {},
): CloudsPngValidateResult {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 8) {
    return { ok: false, error: "empty or truncated png body" };
  }
  if (looksLikeXmlOrHtml(bytes)) {
    return { ok: false, error: "xml/html service exception, not png" };
  }
  if (!hasPngSignature(bytes)) {
    return { ok: false, error: "not a png (missing signature)" };
  }
  const decoded = decodeCloudsPngRgba(bytes);
  if (decoded === null) {
    return { ok: false, error: "png decode failed or alpha channel missing" };
  }
  if (
    options.requireGibsDimensions === true &&
    (decoded.width !== CLOUDS_GIBS_WIDTH_PX || decoded.height !== CLOUDS_GIBS_HEIGHT_PX)
  ) {
    return {
      ok: false,
      error: `unexpected png dimensions ${decoded.width}x${decoded.height}`,
    };
  }
  if (
    options.requireEumetDimensions === true &&
    (decoded.width !== CLOUDS_EUMET_WIDTH_PX ||
      decoded.height !== CLOUDS_EUMET_HEIGHT_PX)
  ) {
    return {
      ok: false,
      error: `unexpected png dimensions ${decoded.width}x${decoded.height}`,
    };
  }
  const minRatio = options.minCoverageRatio ?? CLOUDS_PNG_MIN_USABLE_COVERAGE_RATIO;
  if (decoded.opaqueRatio < minRatio) {
    return {
      ok: false,
      error: "implausibly empty mosaic coverage",
    };
  }
  if (options.requireAfricaEuropeCoverage === true) {
    const africa = sampleEquirectRgbaAlpha(
      decoded.rgba,
      decoded.width,
      decoded.height,
      CLOUDS_EUMET_AFRICA_SAMPLE_LON_DEG,
      CLOUDS_EUMET_AFRICA_SAMPLE_LAT_DEG,
    );
    const europe = sampleEquirectRgbaAlpha(
      decoded.rgba,
      decoded.width,
      decoded.height,
      CLOUDS_EUMET_EUROPE_SAMPLE_LON_DEG,
      CLOUDS_EUMET_EUROPE_SAMPLE_LAT_DEG,
    );
    if ((africa ?? 0) === 0 || (europe ?? 0) === 0) {
      return {
        ok: false,
        error: "Africa/Europe sample is transparent; not a global ring",
      };
    }
  }
  return {
    ok: true,
    width: decoded.width,
    height: decoded.height,
    opaqueRatio: decoded.opaqueRatio,
    byteLength: bytes.byteLength,
  };
}
