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
import type { LibrationConfigV2 } from "../../config/v2/librationConfig";
import { ConfigControlRow } from "./ConfigControlRow";
import type { UserPresetsUiProps } from "./userPresetsPanelTypes";

export type GeneralTabProps = {
  config: LibrationConfigV2;
  userPresetsUi?: UserPresetsUiProps;
};

export function GeneralTab({ config, userPresetsUi }: GeneralTabProps) {
  const [newPresetName, setNewPresetName] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

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
