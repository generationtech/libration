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

import { DEFAULT_TICK_TAPE_AREA_BACKGROUND_COLOR } from "../../config/appConfig";
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
      <fieldset className="config-fieldset config-fieldset--plain">
        <legend className="config-fieldset__legend">Tickmarks tape area</legend>
        <ConfigControlRow label="Background color">
          <input
            type="color"
            className="config-input"
            aria-label="24-hour tickmarks tape area background color"
            title={
              lay.tickTapeAreaBackgroundColor === undefined
                ? "Default tick tape bed — pick to override"
                : "Background for the tickmarks tape band only"
            }
            value={lay.tickTapeAreaBackgroundColor ?? DEFAULT_TICK_TAPE_AREA_BACKGROUND_COLOR}
            disabled={!wired}
            onChange={
              wired && updateConfig
                ? (e) => {
                    updateConfig((draft) => {
                      draft.chrome.layout.tickTapeAreaBackgroundColor = e.currentTarget.value;
                    });
                  }
                : undefined
            }
          />
          <button
            type="button"
            className="config-input"
            aria-label="Reset tickmarks tape area background to default"
            disabled={!wired || lay.tickTapeAreaBackgroundColor === undefined}
            onClick={
              wired && updateConfig
                ? () => {
                    updateConfig((draft) => {
                      delete (draft.chrome.layout as { tickTapeAreaBackgroundColor?: string })
                        .tickTapeAreaBackgroundColor;
                    });
                  }
                : undefined
            }
          >
            Default
          </button>
        </ConfigControlRow>
      </fieldset>
    </div>
  );
}
