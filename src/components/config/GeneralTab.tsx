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

import { useState } from "react";
import {
  PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID,
  PRODUCT_TEXT_RENDERER_DEFAULT_SELECT_LABEL,
  TOP_BAND_HOUR_MARKER_SELECTABLE_FONT_IDS,
} from "../../config/appConfig";
import type { LibrationConfigV2 } from "../../config/v2/librationConfig";
import type { FontAssetId } from "../../typography/fontAssetTypes";
import { defaultFontAssetRegistry } from "../../typography/fontAssetRegistry";
import { ConfigControlRow } from "./ConfigControlRow";
import type { UserPresetsUiProps } from "./userPresetsPanelTypes";

export type GeneralTabProps = {
  config: LibrationConfigV2;
  /** When set, panel font override can be edited. */
  updateConfig?: (updater: (draft: LibrationConfigV2) => void) => void;
  userPresetsUi?: UserPresetsUiProps;
};

export function GeneralTab({ config, updateConfig, userPresetsUi }: GeneralTabProps) {
  const [newPresetName, setNewPresetName] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const wired = Boolean(updateConfig);
  const lay = config.chrome.layout;

  return (
    <div className="config-tab-stack">
      <section className="config-section" aria-labelledby="config-meta-heading">
        <h2 id="config-meta-heading" className="config-section__title">
          Document
        </h2>
        <ConfigControlRow label="Schema version">
          <input
            type="text"
            className="config-input"
            readOnly
            disabled
            value={String(config.meta.schemaVersion)}
            aria-label="Schema version"
          />
        </ConfigControlRow>
      </section>

      <section
        className="config-section"
        aria-labelledby="config-panel-typography-heading"
      >
        <h2 id="config-panel-typography-heading" className="config-section__title">
          Configuration panel
        </h2>
        <p className="config-section__hint">
          Font for text in this panel only. The default row inherits the product-wide default font set under
          Chrome → Layout chrome. An explicit choice overrides that default for the panel.
        </p>
        <ConfigControlRow label="Panel font">
          <select
            className="config-input"
            data-testid="config-shell-panel-font-select"
            value={lay.configUiFontAssetId ?? ""}
            disabled={!wired}
            aria-label="Font for configuration panel text"
            onChange={
              wired && updateConfig
                ? (e) => {
                    const v = e.currentTarget.value;
                    updateConfig((draft) => {
                      if (v === "") {
                        delete (draft.chrome.layout as { configUiFontAssetId?: FontAssetId }).configUiFontAssetId;
                      } else {
                        draft.chrome.layout.configUiFontAssetId = v as FontAssetId;
                      }
                    });
                  }
                : undefined
            }
          >
            <option value="">Default (typography role)</option>
            <option value={PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID}>
              {PRODUCT_TEXT_RENDERER_DEFAULT_SELECT_LABEL}
            </option>
            {TOP_BAND_HOUR_MARKER_SELECTABLE_FONT_IDS.map((id) => {
              const rec = defaultFontAssetRegistry.getById(id);
              return rec ? (
                <option key={id} value={id}>
                  {rec.displayName}
                </option>
              ) : null;
            })}
          </select>
        </ConfigControlRow>
      </section>

      {userPresetsUi ? (
        <section
          className="config-section"
          aria-labelledby="config-user-presets-heading"
        >
          <h2 id="config-user-presets-heading" className="config-section__title">
            Saved configurations
          </h2>
          {userPresetsUi.activePresetId !== null && userPresetsUi.isDirtyFromPreset ? (
            <p className="config-section__hint" role="status">
              The working configuration has been edited since the last loaded preset.
            </p>
          ) : null}
          <div className="config-user-presets-save">
            <ConfigControlRow label="Save current configuration">
              <div className="config-user-presets-save__row">
                <input
                  type="text"
                  className="config-input"
                  value={newPresetName}
                  onChange={(e) => {
                    setNewPresetName(e.target.value);
                    setSaveError(null);
                  }}
                  placeholder="Name"
                  aria-label="New preset name"
                />
                <button
                  type="button"
                  className="config-button config-button--primary"
                  onClick={() => {
                    const r = userPresetsUi.onSaveCurrentAsPreset(newPresetName);
                    if (r.ok) {
                      setNewPresetName("");
                      setSaveError(null);
                    } else if (r.reason === "empty-name") {
                      setSaveError("Enter a name to save.");
                    } else {
                      setSaveError("No working configuration to save.");
                    }
                  }}
                >
                  Save
                </button>
              </div>
            </ConfigControlRow>
            {saveError ? (
              <p className="config-user-presets__error" role="alert">
                {saveError}
              </p>
            ) : null}
          </div>
          {userPresetsUi.presets.length === 0 ? (
            <p className="config-section__hint">No saved configurations yet.</p>
          ) : (
            <ul className="config-user-presets-list" aria-label="Saved configurations">
              {userPresetsUi.presets.map((p) => {
                const isActive = userPresetsUi.activePresetId === p.id;
                return (
                  <li key={p.id} className="config-user-presets-list__item">
                    <span className="config-user-presets-list__name">
                      {p.name}
                      {isActive ? (
                        <span className="config-user-presets-list__badge"> Active</span>
                      ) : null}
                    </span>
                    <div className="config-user-presets-list__actions">
                      <button
                        type="button"
                        className="config-button"
                        onClick={() => {
                          userPresetsUi.onLoadPreset(p.id);
                        }}
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        className="config-button"
                        onClick={() => {
                          const next = window.prompt("Rename preset", p.name);
                          if (next === null) {
                            return;
                          }
                          if (!userPresetsUi.onRenamePreset(p.id, next)) {
                            window.alert("Could not rename: use a non-empty name.");
                          }
                        }}
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        className="config-button config-button--danger"
                        onClick={() => {
                          userPresetsUi.onDeletePreset(p.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
