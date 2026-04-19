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
import { useCallback, useState, type ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID } from "../../config/productFontConstants";
import {
  defaultLibrationConfigV2,
  normalizeLibrationConfig,
  type LibrationConfigV2,
} from "../../config/v2/librationConfig";
import { GeneralTab } from "./GeneralTab";

function GeneralTabTestHarness({
  initial,
  children,
}: {
  initial: LibrationConfigV2;
  children?: (ctx: { config: LibrationConfigV2 }) => ReactNode;
}) {
  const [config, setConfig] = useState<LibrationConfigV2>(() => normalizeLibrationConfig(initial));
  const updateConfig = useCallback((updater: (draft: LibrationConfigV2) => void) => {
    setConfig((prev) => {
      const draft = normalizeLibrationConfig(prev);
      updater(draft);
      return normalizeLibrationConfig(draft);
    });
  }, []);
  return (
    <>
      <GeneralTab config={config} updateConfig={updateConfig} />
      {children?.({ config })}
    </>
  );
}

describe("GeneralTab", () => {
  afterEach(() => {
    cleanup();
  });

  it("places global default text font under Global product defaults after Document", () => {
    const initial = defaultLibrationConfigV2();
    render(<GeneralTabTestHarness initial={initial} />);
    const headings = screen.getAllByRole("heading", { level: 2 });
    const titles = headings.map((h) => h.textContent);
    const docIdx = titles.indexOf("Document");
    const globalIdx = titles.indexOf("Global product defaults");
    expect(docIdx).toBeGreaterThanOrEqual(0);
    expect(globalIdx).toBe(docIdx + 1);
  });

  it("global default text font lists renderer baseline and bundled faces; renderer choice omits storage", () => {
    let last: LibrationConfigV2 | null = null;
    const initial = defaultLibrationConfigV2();
    render(
      <GeneralTabTestHarness initial={initial}>
        {({ config }) => {
          last = config;
          return null;
        }}
      </GeneralTabTestHarness>,
    );
    const sel = screen.getByTestId("general-global-text-font-select");
    const values = Array.from(sel.querySelectorAll("option")).map((o) => (o as HTMLOptionElement).value);
    expect(values).not.toContain("");
    expect(values).toContain(PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID);
    expect(values).toContain("zeroes-two");
    fireEvent.change(sel, { target: { value: "computer" } });
    expect(last!.chrome.layout.defaultTextFontAssetId).toBe("computer");
    fireEvent.change(sel, { target: { value: "zeroes-two" } });
    expect(last!.chrome.layout.defaultTextFontAssetId).toBe("zeroes-two");
    fireEvent.change(sel, { target: { value: PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID } });
    expect(last!.chrome.layout.defaultTextFontAssetId).toBeUndefined();
  });
});
