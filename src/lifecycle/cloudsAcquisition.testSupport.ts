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
 * Test-only GIBS Clouds HTTP fixtures. Not exported from the lifecycle barrel.
 */

import { CLOUDS_GIBS_BAND13_LAYERS } from "./cloudsGibsWms";
import { encodeRgbaPng } from "./cloudsPng";
import type { LiveHttpFetchFn } from "./liveHttpAcquisitionTypes";

export const CLOUDS_TEST_OBSERVATION_ISO = "2023-11-14T22:10:00Z";
export const CLOUDS_TEST_OBSERVATION_MS = Date.parse(CLOUDS_TEST_OBSERVATION_ISO);

export function encodeCloudsTestPng(options: {
  width?: number;
  height?: number;
  /** 0..1 fraction of opaque cold-cloud pixels (rest transparent). */
  opaqueRatio?: number;
  luma?: number;
} = {}): Uint8Array {
  const width = options.width ?? 32;
  const height = options.height ?? 16;
  const opaqueRatio = options.opaqueRatio ?? 0.6;
  const luma = options.luma ?? 180;
  const rgba = new Uint8Array(width * height * 4);
  const threshold = Math.floor(width * height * opaqueRatio);
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    if (i < threshold) {
      rgba[o] = luma;
      rgba[o + 1] = luma;
      rgba[o + 2] = luma;
      rgba[o + 3] = 255;
    }
  }
  const encoded = encodeRgbaPng(width, height, rgba);
  if (encoded === null) {
    throw new Error("encodeCloudsTestPng failed");
  }
  return encoded;
}

export function encodeCloudsCapabilitiesXml(defaultTime: string = CLOUDS_TEST_OBSERVATION_ISO): string {
  return CLOUDS_GIBS_BAND13_LAYERS.map(
    (name) =>
      `<Layer><Name>${name}</Name><Extent name="time" default="${defaultTime}" nearestValue="1">2020-01-01/${defaultTime}/PT10M</Extent></Layer>`,
  ).join("");
}

export function mockCloudsLiveFetch(options: {
  png: Uint8Array;
  capabilitiesXml?: string;
}): LiveHttpFetchFn {
  const xml = options.capabilitiesXml ?? encodeCloudsCapabilitiesXml();
  return async (input) => {
    const url = String(input);
    if (url.includes("GetCapabilities")) {
      const body = new TextEncoder().encode(xml);
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/xml" }),
        url,
        arrayBuffer: async () =>
          body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
      } as Response;
    }
    return {
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "image/png" }),
      url,
      arrayBuffer: async () =>
        options.png.buffer.slice(
          options.png.byteOffset,
          options.png.byteOffset + options.png.byteLength,
        ),
    } as Response;
  };
}
