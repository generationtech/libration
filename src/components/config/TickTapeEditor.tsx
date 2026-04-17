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

export type TickTapeEditorProps = {
  config: LibrationConfigV2;
  updateConfig?: (updater: (draft: LibrationConfigV2) => void) => void;
};

export function TickTapeEditor({ config, updateConfig }: TickTapeEditorProps) {
  const lay = config.chrome.layout;
  const wired = Boolean(updateConfig);

  return (
    <div data-testid="chrome-editor-tick-tape">
      <h3 className="config-section__title config-section__title--sub">24-hour tickmarks tape</h3>
      <p className="config-section__hint">{descriptionForChromeMajorArea("tickTape")}</p>
      <ConfigControlRow label="Show center tickmark tape">
        <input
          type="checkbox"
          className="config-input config-input--checkbox"
          checked={lay.tickTapeVisible}
          readOnly={!wired}
          disabled={!wired}
          tabIndex={wired ? 0 : -1}
          aria-label="Show center tickmark tape between hour indicators and NATO row"
          onChange={
            wired && updateConfig
              ? (e) => {
                  const checked = e.currentTarget.checked;
                  updateConfig((draft) => {
                    draft.chrome.layout.tickTapeVisible = checked;
                  });
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <p className="config-section__hint">
        Boxed numerals on the tape are toggled from the indicator editor when using glyph hour markers.
      </p>
      <p className="config-section__hint">More tick-rail options will appear here as this area expands.</p>
    </div>
  );
}
