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
import { getActiveAppConfig } from "./displayPresets";
import {
  appConfigToV2,
  defaultLibrationConfigV2,
  v2ToAppConfig,
} from "./v2/librationConfig";
import { DEFAULT_APP_CONFIG, DEFAULT_DATA_CONFIG } from "./appConfig";
import { resolveStartupWorkingV2 } from "./v2/workingV2Persistence";

describe("default data mode", () => {
  it("defaults to static mode when no persisted config exists", () => {
    expect(DEFAULT_DATA_CONFIG.mode).toBe("static");
    expect(DEFAULT_APP_CONFIG.data.mode).toBe("static");
    expect(getActiveAppConfig().data.mode).toBe("static");

    const working = resolveStartupWorkingV2(null, () =>
      appConfigToV2(getActiveAppConfig()),
    );
    expect(working.data.mode).toBe("static");

    const v2 = appConfigToV2(DEFAULT_APP_CONFIG);
    expect(v2.data.mode).toBe("static");
    expect(v2ToAppConfig(v2).data.mode).toBe("static");
    expect(defaultLibrationConfigV2().data.mode).toBe("static");
  });
});
