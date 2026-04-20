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

import type { GeographyReferenceMode } from "../../config/appConfig";
import type { LibrationConfigV2 } from "../../config/v2/librationConfig";
import { ConfigControlRow } from "./ConfigControlRow";

export type GeographyTabProps = {
  config: LibrationConfigV2;
  updateConfig?: (updater: (draft: LibrationConfigV2) => void) => void;
};

export function GeographyTab({ config, updateConfig }: GeographyTabProps) {
  const geo = config.geography;
  const wired = Boolean(updateConfig);
  const fixed = geo.fixedCoordinate;

  return (
    <div className="config-tab-stack">
      <section
        className="config-section"
        aria-labelledby="config-geography-heading"
      >
        <h2 id="config-geography-heading" className="config-section__title">
          Geography
        </h2>
        <p className="config-section__hint">
          Map and scene geography. When chrome&apos;s read point meridian is &quot;Auto&quot;, a fixed coordinate here
          supplies the anchor meridian; explicit read-point modes in the Chrome tab still take precedence. This does not
          replace the IANA civil zone — it only participates in resolving the reference frame meridian.
        </p>
        <ConfigControlRow label="Reference mode">
          <select
            className="config-input"
            value={geo.referenceMode}
            disabled={!wired}
            aria-label="Geographic reference mode"
            onChange={
              wired && updateConfig
                ? (e) => {
                    const mode = e.currentTarget.value as GeographyReferenceMode;
                    updateConfig((draft) => {
                      draft.geography.referenceMode = mode;
                    });
                  }
                : undefined
            }
          >
            <option value="greenwich">Greenwich</option>
            <option value="fixedCoordinate">Fixed coordinate</option>
          </select>
        </ConfigControlRow>
        {geo.referenceMode === "fixedCoordinate" ? (
          <>
            <ConfigControlRow label="Label">
              <input
                type="text"
                className="config-input"
                value={fixed.label}
                readOnly={!wired}
                disabled={!wired}
                aria-label="Fixed reference location label"
                onChange={
                  wired && updateConfig
                    ? (e) => {
                        const v = e.currentTarget.value;
                        updateConfig((draft) => {
                          draft.geography.fixedCoordinate.label = v;
                        });
                      }
                    : undefined
                }
              />
            </ConfigControlRow>
            <ConfigControlRow label="Latitude (°)">
              <input
                type="number"
                className="config-input"
                value={Number.isFinite(fixed.latitude) ? String(fixed.latitude) : ""}
                readOnly={!wired}
                disabled={!wired}
                step="any"
                aria-label="Fixed reference latitude in degrees"
                onChange={
                  wired && updateConfig
                    ? (e) => {
                        const n = Number(e.currentTarget.value);
                        if (!Number.isFinite(n)) {
                          return;
                        }
                        updateConfig((draft) => {
                          draft.geography.fixedCoordinate.latitude = n;
                        });
                      }
                    : undefined
                }
              />
            </ConfigControlRow>
            <ConfigControlRow label="Longitude (°)">
              <input
                type="number"
                className="config-input"
                value={Number.isFinite(fixed.longitude) ? String(fixed.longitude) : ""}
                readOnly={!wired}
                disabled={!wired}
                step="any"
                aria-label="Fixed reference longitude in degrees"
                onChange={
                  wired && updateConfig
                    ? (e) => {
                        const n = Number(e.currentTarget.value);
                        if (!Number.isFinite(n)) {
                          return;
                        }
                        updateConfig((draft) => {
                          draft.geography.fixedCoordinate.longitude = n;
                        });
                      }
                    : undefined
                }
              />
            </ConfigControlRow>
            <ConfigControlRow label="Show label on timezone tab">
              <input
                type="checkbox"
                className="config-input config-input--checkbox"
                checked={geo.showFixedCoordinateLabelInTimezoneStrip}
                readOnly={!wired}
                disabled={!wired}
                tabIndex={wired ? 0 : -1}
                aria-label="Show fixed coordinate label on the active NATO timezone tab when this meridian anchors the top band"
                onChange={
                  wired && updateConfig
                    ? (e) => {
                        const checked = e.currentTarget.checked;
                        updateConfig((draft) => {
                          draft.geography.showFixedCoordinateLabelInTimezoneStrip = checked;
                        });
                      }
                    : undefined
                }
              />
            </ConfigControlRow>
          </>
        ) : null}
      </section>
    </div>
  );
}
