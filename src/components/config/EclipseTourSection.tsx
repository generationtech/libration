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

import type { ReactElement } from "react";
import {
  buildEclipseTourSchedule,
  eclipseTourStartYmdFromNow,
} from "../../app/eclipseTourRuntime";
import {
  DEMO_TIME_SPEED_MAX,
  DEMO_TIME_SPEED_MIN,
} from "../../config/appConfig";
import type { LibrationConfigV2 } from "../../config/v2/librationConfig";
import {
  applyEclipseTourPresentationToScene,
  buildDefaultSceneConfigFromLayerFlags,
  eclipseTourPresentationFromScene,
} from "../../config/v2/sceneConfig";
import {
  ECLIPSE_TOUR_OFFSET_IDS,
  eclipseTourOffsetLabel,
  type EclipseTourOffsetId,
} from "../../core/eclipse/eclipseTourAppearance";
import { getEclipseTourAuthorityRange } from "../../core/eclipse/eclipseTourCatalog";
import type { EclipseTourPhase } from "../../core/eclipse/eclipseTourSequence";
import { ConfigControlRow } from "./ConfigControlRow";

type UpdateConfig = (updater: (draft: LibrationConfigV2) => void) => void;

export type EclipseTourSessionUi = {
  phase: EclipseTourPhase;
  currentIndex: number;
  eventCount: number;
  currentTitle: string | null;
  currentDateLabel: string | null;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onStop: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onDeactivate: () => void;
};

function patchTour(
  updateConfig: UpdateConfig | undefined,
  mutate: (
    scene: NonNullable<LibrationConfigV2["scene"]>,
  ) => NonNullable<LibrationConfigV2["scene"]>,
): void {
  if (!updateConfig) {
    return;
  }
  updateConfig((draft) => {
    if (!draft.scene) {
      return;
    }
    draft.scene = mutate(draft.scene);
  });
}

export function EclipseTourSection(props: {
  config: LibrationConfigV2;
  updateConfig?: UpdateConfig;
  session?: EclipseTourSessionUi;
}): ReactElement {
  const { config, updateConfig, session } = props;
  const mutable = Boolean(updateConfig);
  const scene = config.scene ?? buildDefaultSceneConfigFromLayerFlags(config.layers);
  const tour = eclipseTourPresentationFromScene(scene);
  const dateBounds = getEclipseTourAuthorityRange().calendarBounds;
  const matchingCount = scene ? buildEclipseTourSchedule(config).length : 0;
  const familiesOff = !tour.includeSolar && !tour.includeLunar;
  const layersHidden = !config.layers.solarEclipse && !config.layers.lunarEclipse;
  const phase = session?.phase ?? "inactive";
  const playing = phase === "playing";
  const paused = phase === "paused";
  const active = playing || paused;
  const startDisabled = !mutable || !session || familiesOff || matchingCount === 0 || playing;
  const pauseDisabled = !session || !playing;
  const resetDisabled = !session || !active;
  const stopDisabled = !session || !active;
  const prevDisabled = !session || !active || !session.canGoPrevious;
  const nextDisabled = !session || !active || !session.canGoNext;

  const statusLines: string[] = [];
  if (familiesOff) {
    statusLines.push("Select Solar and/or Lunar to enumerate events.");
  } else if (matchingCount === 0) {
    statusLines.push("No matching eclipse events");
  } else {
    statusLines.push(`${matchingCount} matching events`);
    if (active && session?.currentTitle) {
      statusLines.push(session.currentTitle);
      if (session.currentDateLabel) {
        statusLines.push(session.currentDateLabel);
      }
      statusLines.push(`Event ${session.currentIndex + 1} of ${session.eventCount}`);
    }
  }

  return (
    <fieldset className="config-fieldset config-fieldset--plain" data-testid="eclipse-tour-section">
      <legend className="config-fieldset__legend">Eclipse Tour</legend>
      <p className="config-section__hint">
        Sequences catalog eclipses by commanding the existing Demo clock. Data/Demo stays
        domain-neutral. The tour does not change eclipse presentation or forecast horizon.
      </p>

      <ConfigControlRow label="Starting date">
        <input
          type="date"
          className="config-input"
          disabled={!mutable}
          min={dateBounds.minYmd}
          max={dateBounds.maxYmd}
          value={tour.startDateYmd}
          aria-label="Eclipse Tour starting date"
          onChange={
            mutable && updateConfig
              ? (e) => {
                  const startDateYmd = e.currentTarget.value;
                  session?.onDeactivate();
                  patchTour(updateConfig, (s) =>
                    applyEclipseTourPresentationToScene(s, { startDateYmd }),
                  );
                }
              : undefined
          }
        />
      </ConfigControlRow>
      <ConfigControlRow label="Set tour start to now">
        <button
          type="button"
          className="config-button"
          disabled={!mutable}
          aria-label="Set tour start to now"
          onClick={
            mutable && updateConfig
              ? () => {
                  const startDateYmd = eclipseTourStartYmdFromNow(config);
                  patchTour(updateConfig, (s) =>
                    applyEclipseTourPresentationToScene(s, { startDateYmd }),
                  );
                }
              : undefined
          }
        >
          Set tour start to now
        </button>
      </ConfigControlRow>
      <ConfigControlRow label="End date">
        <input
          type="date"
          className="config-input"
          disabled={!mutable}
          min={dateBounds.minYmd}
          max={dateBounds.maxYmd}
          value={tour.endDateYmd}
          aria-label="Eclipse Tour end date"
          onChange={
            mutable && updateConfig
              ? (e) => {
                  const endDateYmd = e.currentTarget.value;
                  session?.onDeactivate();
                  patchTour(updateConfig, (s) =>
                    applyEclipseTourPresentationToScene(s, { endDateYmd }),
                  );
                }
              : undefined
          }
        />
      </ConfigControlRow>

      <div className="config-checkbox-grid">
        <ConfigControlRow label="Solar">
          <input
            type="checkbox"
            className="config-input config-input--checkbox"
            checked={tour.includeSolar}
            disabled={!mutable}
            aria-label="Include solar eclipses in tour"
            onChange={
              mutable && updateConfig
                ? (e) => {
                    session?.onDeactivate();
                    patchTour(updateConfig, (s) =>
                      applyEclipseTourPresentationToScene(s, {
                        includeSolar: e.currentTarget.checked,
                      }),
                    );
                  }
                : undefined
            }
          />
        </ConfigControlRow>
        <ConfigControlRow label="Lunar">
          <input
            type="checkbox"
            className="config-input config-input--checkbox"
            checked={tour.includeLunar}
            disabled={!mutable}
            aria-label="Include lunar eclipses in tour"
            onChange={
              mutable && updateConfig
                ? (e) => {
                    session?.onDeactivate();
                    patchTour(updateConfig, (s) =>
                      applyEclipseTourPresentationToScene(s, {
                        includeLunar: e.currentTarget.checked,
                      }),
                    );
                  }
                : undefined
            }
          />
        </ConfigControlRow>
        <ConfigControlRow label="Loop">
          <input
            type="checkbox"
            className="config-input config-input--checkbox"
            checked={tour.loop}
            disabled={!mutable}
            aria-label="Loop Eclipse Tour"
            onChange={
              mutable && updateConfig
                ? (e) => {
                    patchTour(updateConfig, (s) =>
                      applyEclipseTourPresentationToScene(s, {
                        loop: e.currentTarget.checked,
                      }),
                    );
                  }
                : undefined
            }
          />
        </ConfigControlRow>
      </div>

      <ConfigControlRow label="Start before event">
        <select
          className="config-input"
          disabled={!mutable}
          aria-label="Start before event"
          value={tour.leadInId}
          onChange={
            mutable && updateConfig
              ? (e) => {
                  session?.onDeactivate();
                  patchTour(updateConfig, (s) =>
                    applyEclipseTourPresentationToScene(s, {
                      leadInId: e.currentTarget.value as EclipseTourOffsetId,
                    }),
                  );
                }
              : undefined
          }
        >
          {ECLIPSE_TOUR_OFFSET_IDS.map((id) => (
            <option key={id} value={id}>
              {eclipseTourOffsetLabel(id)}
            </option>
          ))}
        </select>
      </ConfigControlRow>
      <ConfigControlRow label="Continue after event">
        <select
          className="config-input"
          disabled={!mutable}
          aria-label="Continue after event"
          value={tour.postWaitId}
          onChange={
            mutable && updateConfig
              ? (e) => {
                  session?.onDeactivate();
                  patchTour(updateConfig, (s) =>
                    applyEclipseTourPresentationToScene(s, {
                      postWaitId: e.currentTarget.value as EclipseTourOffsetId,
                    }),
                  );
                }
              : undefined
          }
        >
          {ECLIPSE_TOUR_OFFSET_IDS.map((id) => (
            <option key={id} value={id}>
              {eclipseTourOffsetLabel(id)}
            </option>
          ))}
        </select>
      </ConfigControlRow>
      <ConfigControlRow label="Playback speed">
        <input
          type="number"
          className="config-input"
          disabled={!mutable}
          min={DEMO_TIME_SPEED_MIN}
          max={DEMO_TIME_SPEED_MAX}
          step={1}
          value={config.data.demoTime.speedMultiplier}
          aria-label="Eclipse Tour playback speed"
          onChange={
            mutable && updateConfig
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

      <div className="config-eclipse-tour-status" aria-live="polite">
        {statusLines.map((line) => (
          <p key={line} className="config-section__hint">
            {line}
          </p>
        ))}
        {layersHidden ? (
          <p className="config-section__hint">Eclipse layer is hidden</p>
        ) : null}
      </div>

      <ConfigControlRow label="Tour playback">
        <div className="config-eclipse-tour-actions config-demo-transport">
          <button
            type="button"
            className="config-button"
            disabled={prevDisabled}
            aria-label="Previous event"
            onClick={() => session?.onPrevious()}
          >
            Previous
          </button>
          {paused ? (
            <button
              type="button"
              className="config-button config-button--primary"
              disabled={startDisabled}
              aria-label="Resume Eclipse Tour"
              onClick={() => session?.onStart()}
            >
              Resume
            </button>
          ) : (
            <button
              type="button"
              className="config-button config-button--primary"
              disabled={startDisabled}
              aria-label="Start Eclipse Tour"
              onClick={() => session?.onStart()}
            >
              Start
            </button>
          )}
          <button
            type="button"
            className="config-button"
            disabled={pauseDisabled}
            aria-label="Pause Eclipse Tour"
            onClick={() => session?.onPause()}
          >
            Pause
          </button>
          <button
            type="button"
            className="config-button"
            disabled={nextDisabled}
            aria-label="Next event"
            onClick={() => session?.onNext()}
          >
            Next
          </button>
          <button
            type="button"
            className="config-button"
            disabled={resetDisabled}
            aria-label="Reset to current event lead-in"
            onClick={() => session?.onReset()}
          >
            Reset
          </button>
          <button
            type="button"
            className="config-button"
            disabled={stopDisabled}
            aria-label="Stop Eclipse Tour"
            onClick={() => session?.onStop()}
          >
            Stop
          </button>
        </div>
      </ConfigControlRow>
    </fieldset>
  );
}
