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

import type { TopChromeThemeId } from "../../config/appConfig";
import type { LibrationConfigV2 } from "../../config/v2/librationConfig";
import { descriptionForChromeMajorArea } from "./chromeMajorAreaTypes";
import { ConfigControlRow } from "./ConfigControlRow";

const TOP_CHROME_THEMES: readonly TopChromeThemeId[] = ["neutral", "dark", "paper"];

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
      <p className="config-section__hint">
        Boxed numerals on the tape are toggled from the indicator editor when using glyph hour markers.
      </p>
      <ConfigControlRow label="Top chrome theme">
        <select
          className="config-input"
          value={lay.topChromeTheme}
          disabled={!wired}
          aria-label="Top instrument strip color theme"
          onChange={
            wired && updateConfig
              ? (e) => {
                  const theme = e.currentTarget.value as TopChromeThemeId;
                  updateConfig((draft) => {
                    draft.chrome.layout.topChromeTheme = theme;
                  });
                }
              : undefined
          }
        >
          {TOP_CHROME_THEMES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </ConfigControlRow>
      <p className="config-section__hint">More tick-rail options will appear here as this area expands.</p>
    </div>
  );
}
