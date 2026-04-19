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

/** @vitest-environment happy-dom */
import { describe, expect, it } from "vitest";
import { createRef } from "react";
import { render } from "@testing-library/react";
import { normalizeLibrationConfig, defaultLibrationConfigV2 } from "../../config/v2/librationConfig";
import { canvasCssFontFamilyStackForBundledAssetId } from "../../typography/bundledFontCssFamily";
import { resolveDefaultProductTextFontAssetId } from "../../config/productTextFont";
import { ConfigShell } from "./ConfigShell";

describe("ConfigShell", () => {
  it("applies --config-shell-body-font from the resolved global default text font", () => {
    const base = defaultLibrationConfigV2();
    const config = normalizeLibrationConfig({
      ...base,
      chrome: {
        ...base.chrome,
        layout: {
          ...base.chrome.layout,
          defaultTextFontAssetId: "computer",
        },
      },
    });
    const resolvedId = resolveDefaultProductTextFontAssetId(config.chrome.layout);
    const expectedStack = canvasCssFontFamilyStackForBundledAssetId(resolvedId);
    expect(expectedStack).toBeDefined();

    const workingV2Ref = createRef<ReturnType<typeof normalizeLibrationConfig> | null>();
    workingV2Ref.current = config;

    const { container } = render(
      <ConfigShell workingV2Ref={workingV2Ref} panelDomId="test-config-shell" />,
    );
    const shell = container.querySelector("#test-config-shell");
    expect(shell).not.toBeNull();
    const el = shell as HTMLElement;
    expect(el.style.getPropertyValue("--config-shell-body-font").trim()).toBe(expectedStack!.trim());
  });
});
