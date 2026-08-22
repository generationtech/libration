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
import { CLOUDS_EUMET_LAYER_ID, CLOUDS_MSG_FES_LAYER_ID } from "./cloudsEumetWms";
import { encodeRgbaPng } from "./cloudsPng";
import type { LiveHttpFetchFn } from "./liveHttpAcquisitionTypes";

export const CLOUDS_TEST_OBSERVATION_ISO = "2023-11-14T22:10:00Z";
export const CLOUDS_TEST_OBSERVATION_MS = Date.parse(CLOUDS_TEST_OBSERVATION_ISO);
export const CLOUDS_EUMET_TEST_OBSERVATION_ISO = "2023-11-14T21:00:00Z";
export const CLOUDS_EUMET_TEST_OBSERVATION_MS = Date.parse(
  CLOUDS_EUMET_TEST_OBSERVATION_ISO,
);
export const CLOUDS_MSG_TEST_OBSERVATION_ISO = "2023-11-14T22:00:00Z";
export const CLOUDS_MSG_TEST_OBSERVATION_MS = Date.parse(
  CLOUDS_MSG_TEST_OBSERVATION_ISO,
);

export function encodeCloudsTestPng(options: {
  width?: number;
  height?: number;
  /** 0..1 fraction of opaque cold-cloud pixels (rest transparent). */
  opaqueRatio?: number;
  luma?: number;
  /** When true, force Africa/Europe sample pixels opaque (EUMET global sanity). */
  fillAfricaEurope?: boolean;
  /** Lon window [min,max] in degrees; pixels outside stay transparent. */
  lonWindowDeg?: readonly [number, number];
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
  if (options.lonWindowDeg !== undefined) {
    const [lon0, lon1] = options.lonWindowDeg;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const lon = -180 + (x / Math.max(1, width - 1)) * 360;
        const o = (y * width + x) * 4;
        if (lon < lon0 || lon > lon1) {
          rgba[o] = 0;
          rgba[o + 1] = 0;
          rgba[o + 2] = 0;
          rgba[o + 3] = 0;
        }
      }
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

export function encodeCloudsEmptyTestPng(): Uint8Array {
  return encodeCloudsTestPng({ opaqueRatio: 0 });
}

export function encodeCloudsCapabilitiesXml(
  defaultTime: string | Readonly<Record<string, string>> = CLOUDS_TEST_OBSERVATION_ISO,
): string {
  return CLOUDS_GIBS_BAND13_LAYERS.map((name) => {
    const time =
      typeof defaultTime === "string" ? defaultTime : (defaultTime[name] ?? CLOUDS_TEST_OBSERVATION_ISO);
    return `<Layer><Name>${name}</Name><Extent name="time" default="${time}" nearestValue="1">2020-01-01/${time}/PT10M</Extent></Layer>`;
  }).join("");
}

export function encodeEumetCapabilitiesXml(
  defaultTime: string = CLOUDS_EUMET_TEST_OBSERVATION_ISO,
  msgFesTime: string = CLOUDS_MSG_TEST_OBSERVATION_ISO,
): string {
  return (
    `<Layer><Name>${CLOUDS_EUMET_LAYER_ID}</Name><Dimension name="time" default="${defaultTime}" units="ISO8601" nearestValue="1">2021-06-06T15:00:00.000Z/${defaultTime}/PT3H</Dimension></Layer>` +
    `<Layer><Name>${CLOUDS_MSG_FES_LAYER_ID}</Name><Dimension name="time" default="${msgFesTime}" units="ISO8601" nearestValue="1">2020-09-01T00:00:00.000Z/${msgFesTime}/PT15M</Dimension></Layer>`
  );
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

export function wmsTimeFromUrl(url: string): string | null {
  const m = /[?&]TIME=([^&]+)/i.exec(url);
  if (m === null || m[1] === undefined) return null;
  return decodeURIComponent(m[1]);
}

function layerFromUrl(url: string): string | null {
  const m = /[?&]LAYERS=([^&]+)/i.exec(url);
  if (m === null || m[1] === undefined) return null;
  return decodeURIComponent(m[1]);
}

export function mockCloudsLiveFetch(options: {
  png: Uint8Array;
  eumetPng?: Uint8Array;
  msgPng?: Uint8Array;
  capabilitiesXml?: string;
  eumetCapabilitiesXml?: string;
  failEumet?: boolean;
  failMsg?: boolean;
  failGibs?: boolean;
  failGibsLayers?: readonly string[];
  /** Allowed GetMap TIME values. Unknown TIME returns an empty PNG. */
  allowTimes?: readonly string[];
  gibsLayerTimes?: Readonly<Record<string, string>>;
}): LiveHttpFetchFn {
  const gibsXml = options.capabilitiesXml ?? encodeCloudsCapabilitiesXml(options.gibsLayerTimes);
  const eumetXml = options.eumetCapabilitiesXml ?? encodeEumetCapabilitiesXml();
  const eumetPng = options.eumetPng ?? encodeCloudsGlobalTestPng();
  const msgPng = options.msgPng ?? encodeCloudsTestPng({
    opaqueRatio: 0.4,
    fillAfricaEurope: true,
  });
  const empty = encodeCloudsEmptyTestPng();
  const xmlTimes: string[] = [];
  for (const xml of [gibsXml, eumetXml]) {
    for (const m of xml.matchAll(/default="([^"]+)"/g)) {
      if (m[1] !== undefined) xmlTimes.push(m[1]);
    }
  }
  const defaultAllow = options.allowTimes ?? [
    CLOUDS_TEST_OBSERVATION_ISO,
    CLOUDS_EUMET_TEST_OBSERVATION_ISO,
    CLOUDS_MSG_TEST_OBSERVATION_ISO,
    ...(options.gibsLayerTimes !== undefined ? Object.values(options.gibsLayerTimes) : []),
    ...xmlTimes,
  ];
  const allow = new Set(defaultAllow);

  return async (input) => {
    const url = String(input);
    const isEumet = /eumetsat|worldcloudmap|msg_fes/i.test(url);
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
    const time = wmsTimeFromUrl(url);
    const layer = layerFromUrl(url);
    if (time !== null && !allow.has(time)) {
      return pngResponse(url, empty);
    }
    if (isEumet) {
      const isMsg = /msg_fes/i.test(url);
      if (options.failEumet === true && !isMsg) {
        throw new Error("eumet-unavailable");
      }
      if (isMsg) {
        if (options.failEumet === true || options.failMsg === true) {
          throw new Error("msg-unavailable");
        }
        return pngResponse(url, msgPng);
      }
      if (options.failEumet === true) {
        throw new Error("eumet-unavailable");
      }
      return pngResponse(url, eumetPng);
    }
    if (options.failGibs === true) {
      throw new Error("gibs-unavailable");
    }
    if (
      layer !== null &&
      options.failGibsLayers !== undefined &&
      options.failGibsLayers.includes(layer)
    ) {
      throw new Error(`gibs-layer-unavailable:${layer}`);
    }
    if (options.gibsLayerTimes !== undefined && layer !== null && time !== null) {
      const expected = options.gibsLayerTimes[layer];
      if (expected !== undefined && time !== expected) {
        return pngResponse(url, empty);
      }
    }
    return pngResponse(url, options.png);
  };
}
