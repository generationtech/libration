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
import { createTimeContext } from "./time";

describe("createTimeContext", () => {
  it("includes overlayReadabilityFrame when provided", () => {
    const frame = {
      globalNightVeil01: 0.5,
      nightVeil01At: () => 0,
    };
    const ctx = createTimeContext(1, 2, false, { overlayReadabilityFrame: frame });
    expect(ctx.overlayReadabilityFrame).toBe(frame);
  });

  it("omits overlayReadabilityFrame when not provided", () => {
    const ctx = createTimeContext(1, 0, false);
    expect(ctx.overlayReadabilityFrame).toBeUndefined();
  });
});
