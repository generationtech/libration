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
  const tapeOn = lay.tickTapeVisible !== false;

  return (
    <div data-testid="chrome-editor-tick-tape">
      <h3 className="config-section__title config-section__title--sub">24-hour tickmarks tape</h3>
      <p className="config-section__hint">{descriptionForChromeMajorArea("tickTape")}</p>
      <fieldset className="config-fieldset config-fieldset--plain">
        <legend className="config-fieldset__legend">Visibility</legend>
        <ConfigControlRow label="Show 24-hour tickmarks tape">
          <label className="config-control-row__checkbox">
            <input
              type="checkbox"
              checked={tapeOn}
              disabled={!wired}
              aria-label="Show 24-hour tickmarks tape in the top instrument strip"
              onChange={
                wired && updateConfig
                  ? (e) => {
                      const on = e.currentTarget.checked;
                      updateConfig((draft) => {
                        draft.chrome.layout.tickTapeVisible = on;
                      });
                    }
                  : undefined
              }
            />
            <span>Tape ticks, baseline, and tape present-time marker</span>
          </label>
        </ConfigControlRow>
      </fieldset>
      <p className="config-section__hint">
        Boxed numerals on the tape are toggled from the indicator editor when using glyph hour markers.
      </p>
      {!tapeOn ? (
        <p className="config-section__hint">Turn the tape on to show the tick rail and tape-carried elements.</p>
      ) : (
        <p className="config-section__hint">More tick-rail options will appear here as this area expands.</p>
      )}
    </div>
  );
}
