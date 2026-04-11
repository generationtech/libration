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

import type { LibrationConfigV2 } from "../../config/v2/librationConfig";
import { descriptionForChromeMajorArea } from "./chromeMajorAreaTypes";
import { ConfigControlRow } from "./ConfigControlRow";

export type NatoTimezoneEditorProps = {
  config: LibrationConfigV2;
  updateConfig?: (updater: (draft: LibrationConfigV2) => void) => void;
};

export function NatoTimezoneEditor({ config, updateConfig }: NatoTimezoneEditorProps) {
  const lay = config.chrome.layout;
  const wired = Boolean(updateConfig);

  return (
    <div data-testid="chrome-editor-nato-timezone">
      <h3 className="config-section__title config-section__title--sub">NATO timezone area</h3>
      <p className="config-section__hint">{descriptionForChromeMajorArea("natoTimezone")}</p>
      <ConfigControlRow label="NATO timezone letter row">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          checked={lay.timezoneLetterRowVisible}
          readOnly={!wired}
          disabled={!wired}
          tabIndex={wired ? 0 : -1}
          aria-label="Show NATO timezone letter row on the top strip"
          onChange={
            wired && updateConfig
              ? (e) => {
                  const checked = e.currentTarget.checked;
                  updateConfig((draft) => {
                    draft.chrome.layout.timezoneLetterRowVisible = checked;
                  });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <p className="config-section__hint">More NATO strip options will appear here as this area expands.</p>
    </div>
  );
}
