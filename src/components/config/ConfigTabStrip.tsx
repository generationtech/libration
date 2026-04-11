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

import type { ConfigTabDef, ConfigTabId } from "./configTabs";

export type ConfigTabStripProps = {
  tabs: readonly ConfigTabDef[];
  activeTabId: ConfigTabId;
  onSelect: (id: ConfigTabId) => void;
  labelledBy?: string;
};

export function ConfigTabStrip({
  tabs,
  activeTabId,
  onSelect,
  labelledBy,
}: ConfigTabStripProps) {
  return (
    <div
      className="config-tab-strip"
      role="tablist"
      aria-label={labelledBy ?? "Configuration sections"}
    >
      {tabs.map((tab) => {
        const selected = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`config-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`config-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            className={`config-tab-strip__tab${selected ? " config-tab-strip__tab--active" : ""}`}
            onClick={() => onSelect(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
