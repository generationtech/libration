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
 * Test-only Clouds HTTP fixtures. Not exported from the lifecycle barrel.
 */

import { CLOUDS_GIBS_BAND13_LAYERS } from "./cloudsGibsWms";
import { CLOUDS_EUMET_LAYER_ID } from "./cloudsEumetWms";
import { encodeRgbaPng } from "./cloudsPng";
import type { LiveHttpFetchFn } from "./liveHttpAcquisitionTypes";

export const CLOUDS_TEST_OBSERVATION_ISO = "2023-11-14T22:10:00Z";
export const CLOUDS_TEST_OBSERVATION_MS = Date.parse(CLOUDS_TEST_OBSERVATION_ISO);
export const CLOUDS_EUMET_TEST_OBSERVATION_ISO = "2023-11-14T21:00:00Z";
export const CLOUDS_EUMET_TEST_OBSERVATION_MS = Date.parse(
  CLOUDS_EUMET_TEST_OBSERVATION_ISO,
);

export function encodeCloudsTestPng(options: {
  width?: number;
  height?: number;
  /** 0..1 fraction of opaque cold-cloud pixels (rest transparent). */
  opaqueRatio?: number;
  luma?: number;
  /** When true, force Africa/Europe sample pixels opaque (EUMET global sanity). */
  fillAfricaEurope?: boolean;
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
  if (options.fillAfricaEurope === true) {
    const paint = (lon: number, lat: number) => {
      const x = Math.round(((lon + 180) / 360) * (width - 1));
      const y = Math.round(((90 - lat) / 180) * (height - 1));
      const o = (y * width + x) * 4;
      rgba[o] = luma;
      rgba[o + 1] = luma;
      rgba[o + 2] = luma;
      rgba[o + 3] = 255;
    };
    paint(20, 0);
    paint(10, 50);
  }
  const encoded = encodeRgbaPng(width, height, rgba);
  if (encoded === null) {
    throw new Error("encodeCloudsTestPng failed");
  }
  return encoded;
}

export function encodeCloudsGlobalTestPng(): Uint8Array {
  return encodeCloudsTestPng({ opaqueRatio: 0.88, fillAfricaEurope: true });
}

export function encodeCloudsCapabilitiesXml(
  defaultTime: string = CLOUDS_TEST_OBSERVATION_ISO,
): string {
  return CLOUDS_GIBS_BAND13_LAYERS.map(
    (name) =>
      `<Layer><Name>${name}</Name><Extent name="time" default="${defaultTime}" nearestValue="1">2020-01-01/${defaultTime}/PT10M</Extent></Layer>`,
  ).join("");
}

export function encodeEumetCapabilitiesXml(
  defaultTime: string = CLOUDS_EUMET_TEST_OBSERVATION_ISO,
): string {
  return `<Layer><Name>${CLOUDS_EUMET_LAYER_ID}</Name><Dimension name="time" default="${defaultTime}" units="ISO8601" nearestValue="1">2021-06-06T15:00:00.000Z/${defaultTime}/PT3H</Dimension></Layer>`;
}

function pngResponse(url: string, png: Uint8Array): Response {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "image/png" }),
    url,
    arrayBuffer: async () =>
      png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength),
  } as Response;
}

function xmlResponse(url: string, xml: string): Response {
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

export function mockCloudsLiveFetch(options: {
  png: Uint8Array;
  eumetPng?: Uint8Array;
  capabilitiesXml?: string;
  eumetCapabilitiesXml?: string;
  failEumet?: boolean;
  failGibs?: boolean;
}): LiveHttpFetchFn {
  const gibsXml = options.capabilitiesXml ?? encodeCloudsCapabilitiesXml();
  const eumetXml = options.eumetCapabilitiesXml ?? encodeEumetCapabilitiesXml();
  const eumetPng = options.eumetPng ?? encodeCloudsGlobalTestPng();
  return async (input) => {
    const url = String(input);
    const isEumet = /eumetsat|worldcloudmap/i.test(url);
    if (url.includes("GetCapabilities")) {
      if (isEumet) {
        if (options.failEumet === true) {
          return {
            ok: false,
            status: 503,
            headers: new Headers({ "content-type": "text/plain" }),
            url,
            arrayBuffer: async () => new ArrayBuffer(0),
          } as Response;
        }
        return xmlResponse(url, eumetXml);
      }
      return xmlResponse(url, gibsXml);
    }
    if (isEumet) {
      if (options.failEumet === true) {
        throw new Error("eumet-unavailable");
      }
      return pngResponse(url, eumetPng);
    }
    if (options.failGibs === true) {
      throw new Error("gibs-unavailable");
    }
    return pngResponse(url, options.png);
  };
}
