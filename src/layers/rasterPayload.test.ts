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

import { describe, expect, it } from "vitest";
import { EQUIRECTANGULAR_RASTER_KIND, isEquirectangularRasterPayload } from "./rasterPayload";

describe("isEquirectangularRasterPayload", () => {
  it("rejects invalid readability object", () => {
    expect(
      isEquirectangularRasterPayload({
        kind: EQUIRECTANGULAR_RASTER_KIND,
        src: "/x.jpg",
        readability: { nightVeil01: 2 },
      }),
    ).toBe(false);
  });

  it("accepts optional readability in range", () => {
    expect(
      isEquirectangularRasterPayload({
        kind: EQUIRECTANGULAR_RASTER_KIND,
        src: "/x.jpg",
        readability: { nightVeil01: 0.5 },
      }),
    ).toBe(true);
  });
});
