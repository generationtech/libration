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

import type { DataMode } from "../../config/appConfig";
import {
  DEMO_TIME_SPEED_MAX,
  DEMO_TIME_SPEED_MIN,
} from "../../config/appConfig";
import type { LibrationConfigV2 } from "../../config/v2/librationConfig";
import { resolveDisplayTimeReferenceZone } from "../../core/displayTimeReference";
import { ConfigControlRow } from "./ConfigControlRow";
import { DemoTimeStartFields } from "./DemoTimeStartFields";
import { demoTimeStartIsoUtcNow } from "./demoTimeStartIso";

/** Local runtime demo playback transport (not config); wired from App. */
export type DemoTransportUiProps = {
  paused: boolean;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
};

export type DataTabProps = {
  config: LibrationConfigV2;
  updateConfig?: (updater: (draft: LibrationConfigV2) => void) => void;
  /** Runtime-only demo playback transport; does not use `updateConfig`. */
  demoTransport?: DemoTransportUiProps;
};

export function DataTab({ config, updateConfig, demoTransport }: DataTabProps) {
  const data = config.data;
  const wired = Boolean(updateConfig);
  const demoPipeline = data.mode === "demo";
  const demoControlsEnabled = wired && demoPipeline;
  const demoTimeOn = data.demoTime.enabled;
  const transportEnabled =
    Boolean(demoTransport) && demoPipeline && demoTimeOn;

  return (
    <div className="config-tab-stack">
      <section className="config-section" aria-labelledby="config-data-heading">
        <h2 id="config-data-heading" className="config-section__title">
          Data
        </h2>
        <p className="config-section__hint">
          Local configuration only. No live network feeds, subscriptions, or background refresh.
        </p>
        <ConfigControlRow label="Mode">
          <select
            className="config-input"
            value={data.mode}
            disabled={!wired}
            aria-label="Data pipeline mode"
            onChange={
              wired && updateConfig
                ? (e) => {
                    const mode = e.currentTarget.value as DataMode;
                    updateConfig((draft) => {
                      const prevMode = draft.data.mode;
                      draft.data.mode = mode;
                      if (prevMode !== "demo" && mode === "demo") {
                        draft.data.demoTime.startIsoUtc = demoTimeStartIsoUtcNow();
                      }
                    });
                  }
                : undefined
            }
          >
            <option value="static">Static (built-in / offline)</option>
            <option value="demo">Demo (illustrative sequences only)</option>
          </select>
        </ConfigControlRow>
        <ConfigControlRow label="Show data annotations">
          <input
            type="checkbox"
            className="config-input config-input--checkbox"
            checked={data.showDataAnnotations}
            readOnly={!wired}
            disabled={!wired}
            tabIndex={wired ? 0 : -1}
            aria-label="Show data annotations when available"
            onChange={
              wired && updateConfig
                ? (e) => {
                    const checked = e.currentTarget.checked;
                    updateConfig((draft) => {
                      draft.data.showDataAnnotations = checked;
                    });
                  }
                : undefined
            }
          />
        </ConfigControlRow>
        <p className="config-section__hint">
          Demo time replaces the wall-clock instant only (`nowUtcInstant`); reference zone, meridian read point, and display
          formatting stay as configured. Local deterministic playback — not live data. Set mode to Demo to configure.
        </p>
        <ConfigControlRow label="Enable demo time">
          <input
            type="checkbox"
            className="config-input config-input--checkbox"
            checked={data.demoTime.enabled}
            readOnly={!demoControlsEnabled}
            disabled={!demoControlsEnabled}
            tabIndex={demoControlsEnabled ? 0 : -1}
            aria-label="Enable demo time"
            onChange={
              demoControlsEnabled && updateConfig
                ? (e) => {
                    const checked = e.currentTarget.checked;
                    updateConfig((draft) => {
                      draft.data.demoTime.enabled = checked;
                    });
                  }
                : undefined
            }
          />
        </ConfigControlRow>
        <ConfigControlRow label="Demo start">
          <DemoTimeStartFields
            committedStartIsoUtc={data.demoTime.startIsoUtc}
            topBandMode={config.chrome.displayTime.topBandMode}
            resolvedReferenceTimeZone={resolveDisplayTimeReferenceZone(
              config.chrome.displayTime.referenceTimeZone,
            )}
            disabled={!demoControlsEnabled}
            onCommit={
              demoControlsEnabled && updateConfig
                ? (startIsoUtc) => {
                    updateConfig((draft) => {
                      draft.data.demoTime.startIsoUtc = startIsoUtc;
                    });
                  }
                : () => {}
            }
          />
        </ConfigControlRow>
        <ConfigControlRow label="Playback speed">
          <input
            type="number"
            className="config-input"
            value={data.demoTime.speedMultiplier}
            readOnly={!demoControlsEnabled}
            disabled={!demoControlsEnabled}
            min={DEMO_TIME_SPEED_MIN}
            max={DEMO_TIME_SPEED_MAX}
            step={1}
            aria-label="Playback speed"
            onChange={
              demoControlsEnabled && updateConfig
                ? (e) => {
                    const n = Number(e.currentTarget.value);
                    updateConfig((draft) => {
                      draft.data.demoTime.speedMultiplier = n;
                    });
                  }
                : undefined
            }
          />
        </ConfigControlRow>
        <p className="config-section__hint">
          Local demo playback (this session only): pause, resume, or reset to the configured demo
          start — does not change saved configuration.
        </p>
        <ConfigControlRow label="Demo playback">
          <div className="config-demo-transport">
            {transportEnabled && demoTransport ? (
              <>
                {demoTransport.paused ? (
                  <button
                    type="button"
                    className="config-button config-button--primary"
                    aria-label="Resume demo playback"
                    onClick={() => {
                      demoTransport.onResume();
                    }}
                  >
                    Resume
                  </button>
                ) : (
                  <button
                    type="button"
                    className="config-button"
                    aria-label="Pause demo playback"
                    onClick={() => {
                      demoTransport.onPause();
                    }}
                  >
                    Pause
                  </button>
                )}
                <button
                  type="button"
                  className="config-button"
                  aria-label="Reset demo playback to configured start"
                  onClick={() => {
                    demoTransport.onReset();
                  }}
                >
                  Reset
                </button>
                <span
                  className={
                    demoTransport.paused
                      ? "config-demo-transport__status config-demo-transport__status--paused"
                      : "config-demo-transport__status config-demo-transport__status--playing"
                  }
                  aria-live="polite"
                >
                  {demoTransport.paused ? "Paused" : "Playing"}
                </span>
              </>
            ) : (
              <span className="config-demo-transport__inactive">
                Enable demo mode and demo time to use playback controls.
              </span>
            )}
          </div>
        </ConfigControlRow>
      </section>
    </div>
  );
}
