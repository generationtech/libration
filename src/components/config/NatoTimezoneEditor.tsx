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

import {
  DEFAULT_TIMEZONE_LETTER_ROW_CELL_BACKGROUND_COLOR_EVEN,
  DEFAULT_TIMEZONE_LETTER_ROW_CELL_BACKGROUND_COLOR_ODD,
  DEFAULT_TIMEZONE_LETTER_ROW_LETTER_FOREGROUND_COLOR,
  PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID,
  PRODUCT_TEXT_RENDERER_DEFAULT_SELECT_LABEL,
  TOP_BAND_HOUR_MARKER_SELECTABLE_FONT_IDS,
} from "../../config/appConfig";
import type { FontAssetId } from "../../typography/fontAssetTypes";
import { defaultFontAssetRegistry } from "../../typography/fontAssetRegistry";
import { resolveEffectiveTimezoneLetterRowArea } from "../../config/topBandTimezoneLetterRowResolver";
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
  const effectiveTzLetterRow = resolveEffectiveTimezoneLetterRowArea(lay);

  return (
    <div data-testid="chrome-editor-nato-timezone">
      <h3 className="config-section__title config-section__title--sub">NATO / structural zone row</h3>
      <p className="config-section__hint">{descriptionForChromeMajorArea("natoTimezone")}</p>
      <p className="config-section__hint">
        This row is a fixed 15° geometric grid with military-style letters — not your reference civil clock. Civil date and
        time come from the zone and instant above; the highlighted cell only marks the read-point column.
      </p>
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
      <fieldset className="config-fieldset config-fieldset--plain">
        <legend className="config-fieldset__legend">NATO letter row appearance</legend>
        <ConfigControlRow label="Zone letter font">
          <select
            className="config-input"
            value={lay.timezoneLetterRowFontAssetId ?? ""}
            disabled={!wired}
            aria-label="Font for NATO timezone letters"
            data-testid="nato-timezone-letter-font-select"
            onChange={
              wired && updateConfig
                ? (e) => {
                    const v = e.currentTarget.value;
                    updateConfig((draft) => {
                      if (v === "") {
                        delete (draft.chrome.layout as { timezoneLetterRowFontAssetId?: string })
                          .timezoneLetterRowFontAssetId;
                      } else {
                        draft.chrome.layout.timezoneLetterRowFontAssetId = v as FontAssetId;
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
        <ConfigControlRow label="Alternating cell background (even columns)">
          <input
            type="color"
            className="config-input"
            aria-label="NATO timezone strip even-column cell background color"
            title={
              lay.timezoneLetterRowCellBackgroundColorEven === undefined
                ? "Default even-column fill — pick to override"
                : "Even-column cell background"
            }
            value={
              lay.timezoneLetterRowCellBackgroundColorEven ?? DEFAULT_TIMEZONE_LETTER_ROW_CELL_BACKGROUND_COLOR_EVEN
            }
            disabled={!wired}
            onChange={
              wired && updateConfig
                ? (e) => {
                    updateConfig((draft) => {
                      draft.chrome.layout.timezoneLetterRowCellBackgroundColorEven = e.currentTarget.value;
                    });
                  }
                : undefined
            }
          />
          <button
            type="button"
            className="config-input"
            aria-label="Reset even-column NATO cell background to default"
            disabled={!wired || lay.timezoneLetterRowCellBackgroundColorEven === undefined}
            onClick={
              wired && updateConfig
                ? () => {
                    updateConfig((draft) => {
                      delete (draft.chrome.layout as { timezoneLetterRowCellBackgroundColorEven?: string })
                        .timezoneLetterRowCellBackgroundColorEven;
                    });
                  }
                : undefined
            }
          >
            Default
          </button>
        </ConfigControlRow>
        <ConfigControlRow label="Alternating cell background (odd columns)">
          <input
            type="color"
            className="config-input"
            aria-label="NATO timezone strip odd-column cell background color"
            title={
              lay.timezoneLetterRowCellBackgroundColorOdd === undefined
                ? "Default odd-column fill — pick to override"
                : "Odd-column cell background"
            }
            value={
              lay.timezoneLetterRowCellBackgroundColorOdd ?? DEFAULT_TIMEZONE_LETTER_ROW_CELL_BACKGROUND_COLOR_ODD
            }
            disabled={!wired}
            onChange={
              wired && updateConfig
                ? (e) => {
                    updateConfig((draft) => {
                      draft.chrome.layout.timezoneLetterRowCellBackgroundColorOdd = e.currentTarget.value;
                    });
                  }
                : undefined
            }
          />
          <button
            type="button"
            className="config-input"
            aria-label="Reset odd-column NATO cell background to default"
            disabled={!wired || lay.timezoneLetterRowCellBackgroundColorOdd === undefined}
            onClick={
              wired && updateConfig
                ? () => {
                    updateConfig((draft) => {
                      delete (draft.chrome.layout as { timezoneLetterRowCellBackgroundColorOdd?: string })
                        .timezoneLetterRowCellBackgroundColorOdd;
                    });
                  }
                : undefined
            }
          >
            Default
          </button>
        </ConfigControlRow>
        <ConfigControlRow label="Read-point column highlight (structural)">
          <input
            type="color"
            className="config-input"
            aria-label="Read-point column background color in the NATO structural row"
            title={
              lay.timezoneLetterRowActiveCellBackgroundColor === undefined
                ? "Automatic read-point column fill — darker shade derived from the current even/odd NATO palette"
                : "Read-point column background override (structural overlay)"
            }
            value={
              lay.timezoneLetterRowActiveCellBackgroundColor ??
              effectiveTzLetterRow.effectiveBackgroundColorActive
            }
            disabled={!wired}
            onChange={
              wired && updateConfig
                ? (e) => {
                    updateConfig((draft) => {
                      draft.chrome.layout.timezoneLetterRowActiveCellBackgroundColor = e.currentTarget.value;
                    });
                  }
                : undefined
            }
          />
          <button
            type="button"
            className="config-input"
            aria-label="Reset read-point NATO cell background to automatic (derived from even/odd palette)"
            disabled={!wired || lay.timezoneLetterRowActiveCellBackgroundColor === undefined}
            onClick={
              wired && updateConfig
                ? () => {
                    updateConfig((draft) => {
                      delete (draft.chrome.layout as { timezoneLetterRowActiveCellBackgroundColor?: string })
                        .timezoneLetterRowActiveCellBackgroundColor;
                    });
                  }
                : undefined
            }
          >
            Default
          </button>
        </ConfigControlRow>
        <ConfigControlRow label="Zone letter color">
          <input
            type="color"
            className="config-input"
            aria-label="NATO zone letter foreground color"
            title={
              lay.timezoneLetterRowLetterForegroundColor === undefined
                ? "Automatic contrast vs cell backgrounds — pick to override"
                : "Zone letter color override"
            }
            value={
              lay.timezoneLetterRowLetterForegroundColor ?? DEFAULT_TIMEZONE_LETTER_ROW_LETTER_FOREGROUND_COLOR
            }
            disabled={!wired}
            onChange={
              wired && updateConfig
                ? (e) => {
                    updateConfig((draft) => {
                      draft.chrome.layout.timezoneLetterRowLetterForegroundColor = e.currentTarget.value;
                    });
                  }
                : undefined
            }
          />
          <button
            type="button"
            className="config-input"
            aria-label="Clear NATO zone letter color override (automatic contrast)"
            disabled={!wired || lay.timezoneLetterRowLetterForegroundColor === undefined}
            onClick={
              wired && updateConfig
                ? () => {
                    updateConfig((draft) => {
                      delete (draft.chrome.layout as { timezoneLetterRowLetterForegroundColor?: string })
                        .timezoneLetterRowLetterForegroundColor;
                    });
                  }
                : undefined
            }
          >
            Automatic
          </button>
        </ConfigControlRow>
      </fieldset>
    </div>
  );
}
