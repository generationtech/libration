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

import "@testing-library/jest-dom/vitest";

/**
 * happy-dom does not ship {@link Path2D}; chrome layout builders and executor tests need a minimal stub.
 */
if (typeof Path2D === "undefined") {
  globalThis.Path2D = class {
    moveTo(): void {}
    lineTo(): void {}
    arc(): void {}
    arcTo(): void {}
    closePath(): void {}
    rect(): void {}
  } as unknown as typeof Path2D;
}

/** happy-dom’s {@link Path2D} may omit {@link CanvasPath.arc}; the bridge and tests require it. */
if (typeof Path2D !== "undefined" && typeof Path2D.prototype.arc !== "function") {
  Path2D.prototype.arc = function (): void {
    // No-op: enough for unit tests that only assert fill(path) / stroke(path) dispatch.
  };
}

/**
 * happy-dom may not provide a canvas 2D context; App integration tests still mount
 * the render loop, so supply a minimal proxy when the native context is missing.
 */
if (typeof HTMLCanvasElement !== "undefined") {
  const origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (
    this: HTMLCanvasElement,
    ...args: Parameters<typeof origGetContext>
  ): ReturnType<typeof origGetContext> {
    const ctx = origGetContext.apply(this, args);
    if (ctx) {
      return ctx;
    }
    const [type] = args;
    if (type === "2d") {
      return createFallbackCanvas2dContext(this);
    }
    return null;
  } as typeof origGetContext;
}

function createFallbackCanvas2dContext(
  canvas: HTMLCanvasElement,
): CanvasRenderingContext2D {
  const store: Record<string, unknown> = {
    globalAlpha: 1,
    fillStyle: "#000",
    strokeStyle: "#000",
    lineWidth: 1,
    font: "10px sans-serif",
    textAlign: "start",
    textBaseline: "alphabetic",
    imageSmoothingEnabled: true,
    lineJoin: "miter",
    lineCap: "butt",
    miterLimit: 10,
    shadowColor: "rgba(0,0,0,0)",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  };
  const noop = (): void => {};
  const gradient = { addColorStop: noop };

  return new Proxy({} as CanvasRenderingContext2D, {
    set(_target, prop, value) {
      store[String(prop)] = value;
      return true;
    },
    get(_target, prop) {
      if (prop === "canvas") {
        return canvas;
      }
      const p = String(prop);
      if (p in store) {
        return store[p];
      }
      if (p === "createLinearGradient" || p === "createRadialGradient") {
        return () => gradient;
      }
      if (p === "createPattern") {
        return () => null;
      }
      if (p === "createImageData") {
        return (sw: number, sh: number) => {
          const data = new Uint8ClampedArray(sw * sh * 4);
          return { data, width: sw, height: sh };
        };
      }
      if (p === "getImageData") {
        return () => ({
          data: new Uint8ClampedArray(4),
          width: 1,
          height: 1,
        });
      }
      if (p === "measureText") {
        return () => ({ width: 0 });
      }
      return noop;
    },
  });
}
