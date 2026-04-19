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

import { useMemo, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID } from "../../config/productFontConstants";
import { resolveConfigUiTextFontAssetId } from "../../config/productTextFont";
import type { LibrationConfigV2 } from "../../config/v2/librationConfig";
import { canvasCssFontFamilyStackForBundledAssetId } from "../../typography/bundledFontCssFamily";
import { CONFIG_TAB_DEFS, type ConfigTabId } from "./configTabs";
import type { UserPresetsUiProps } from "./userPresetsPanelTypes";
import { ConfigTabPanel } from "./ConfigTabPanel";
import { ConfigTabStrip } from "./ConfigTabStrip";
import { ChromeTab } from "./ChromeTab";
import { DataTab, type DemoTransportUiProps } from "./DataTab";
import { GeneralTab } from "./GeneralTab";
import { GeographyTab } from "./GeographyTab";
import { LayersTab } from "./LayersTab";
import { PinsTab } from "./PinsTab";
import "./ConfigShell.css";

export type { UserPresetsUiProps } from "./userPresetsPanelTypes";

export type { DemoTransportUiProps };

export type ConfigShellProps = {
  /** DOM id for the panel root (dialog labelling / launcher `aria-controls`). */
  panelDomId?: string;
  /** Single source of truth for displayed configuration (read via `.current` each render). */
  workingV2Ref: RefObject<LibrationConfigV2 | null>;
  /** Optional guarded updater; inactive while {@link ALLOW_PHASE3_MUTATIONS} is false in App. */
  updateConfig?: (updater: (draft: LibrationConfigV2) => void) => void;
  /** User-named full v2 snapshots (Phase 5); optional when panel is read-only. */
  userPresetsUi?: UserPresetsUiProps;
  /** Demo play / pause / reset; runtime-only, does not mutate persisted config. */
  demoTransport?: DemoTransportUiProps;
};

function renderActiveTabContent(
  tabId: ConfigTabId,
  config: LibrationConfigV2,
  updateConfig: ConfigShellProps["updateConfig"],
  userPresetsUi: ConfigShellProps["userPresetsUi"],
  demoTransport: ConfigShellProps["demoTransport"],
): ReactNode {
  switch (tabId) {
    case "layers":
      return <LayersTab config={config} updateConfig={updateConfig} />;
    case "pins":
      return <PinsTab config={config} updateConfig={updateConfig} />;
    case "chrome":
      return <ChromeTab config={config} updateConfig={updateConfig} />;
    case "geography":
      return <GeographyTab config={config} updateConfig={updateConfig} />;
    case "data":
      return (
        <DataTab
          config={config}
          updateConfig={updateConfig}
          demoTransport={demoTransport}
        />
      );
    case "general":
      return (
        <GeneralTab
          config={config}
          updateConfig={updateConfig}
          userPresetsUi={userPresetsUi}
        />
      );
  }
}

export function ConfigShell({
  panelDomId = "libration-config-shell",
  workingV2Ref,
  updateConfig,
  userPresetsUi,
  demoTransport,
}: ConfigShellProps) {
  const [activeTabId, setActiveTabId] = useState<ConfigTabId>("layers");
  const config = workingV2Ref.current;
  const titleId = `${panelDomId}-title`;
  const uiFontStack = useMemo(() => {
    if (!config) {
      return undefined;
    }
    const id = resolveConfigUiTextFontAssetId(config.chrome.layout);
    if (id === PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID) {
      return undefined;
    }
    return canvasCssFontFamilyStackForBundledAssetId(id) ?? "system-ui, sans-serif";
  }, [config]);

  if (!config) {
    return (
      <aside
        id={panelDomId}
        className="config-shell"
        aria-label="Configuration"
      >
        <p className="config-shell__empty">Configuration is not available.</p>
      </aside>
    );
  }

  return (
    <aside
      id={panelDomId}
      className="config-shell"
      aria-label="Configuration"
      data-has-update-handler={updateConfig ? "true" : "false"}
      style={
        uiFontStack !== undefined
          ? { ["--config-shell-body-font" as string]: uiFontStack }
          : undefined
      }
    >
      <header className="config-shell__header">
        <h1 id={titleId} className="config-shell__title">
          Configuration
        </h1>
      </header>
      <ConfigTabStrip
        tabs={CONFIG_TAB_DEFS}
        activeTabId={activeTabId}
        onSelect={setActiveTabId}
      />
      {CONFIG_TAB_DEFS.map((tab) => (
        <ConfigTabPanel
          key={tab.id}
          id={`config-panel-${tab.id}`}
          labelledBy={`config-tab-${tab.id}`}
          hidden={tab.id !== activeTabId}
        >
          {renderActiveTabContent(
            tab.id,
            config,
            updateConfig,
            userPresetsUi,
            demoTransport,
          )}
        </ConfigTabPanel>
      ))}
    </aside>
  );
}
