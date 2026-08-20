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
  buildEclipsePlaybackSchedule,
  buildEventPlaybackSchedule,
  eventPlaybackStartYmdFromNow,
} from "../../app/eventPlaybackRuntime";
import {
  DEMO_TIME_SPEED_MAX,
  DEMO_TIME_SPEED_MIN,
} from "../../config/appConfig";
import type { LibrationConfigV2 } from "../../config/v2/librationConfig";
import {
  applyEventPlaybackEclipse,
  applyEventPlaybackMilkyWay,
  getMilkyWayPlaybackCalendarBounds,
  type EventPlaybackFamilyId,
} from "../../core/eventPlayback/eventPlaybackConfig";
import {
  EVENT_PLAYBACK_OFFSET_IDS,
  eventPlaybackOffsetLabel,
  type EventPlaybackOffsetId,
} from "../../core/eventPlayback/eventPlaybackOffsets";
import { getEclipseTourAuthorityRange } from "../../core/eclipse/eclipseTourCatalog";
import type { EventPlaybackPhase } from "../../core/eventPlayback/eventPlaybackSequence";
import { resolveReferenceCityObserverLocation } from "../../core/referenceCityObserver";
import { REFERENCE_CITIES } from "../../data/referenceCities";
import { ConfigControlRow } from "./ConfigControlRow";

type UpdateConfig = (updater: (draft: LibrationConfigV2) => void) => void;

export type EventPlaybackSessionUi = {
  phase: EventPlaybackPhase;
  currentIndex: number;
  eventCount: number;
  currentTitle: string | null;
  currentDateLabel: string | null;
  extraStatusLines: readonly string[];
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

/** @deprecated Use {@link EventPlaybackSessionUi}. */
export type EclipseTourSessionUi = EventPlaybackSessionUi;

const MW_COUNT_SPAN_MS = 12 * 365.25 * 86_400_000;

function patchPlayback(updateConfig: UpdateConfig | undefined, mutate: (draft: LibrationConfigV2) => void): void {
  if (!updateConfig) {
    return;
  }
  updateConfig(mutate);
}

function cityNameFromConfig(config: LibrationConfigV2): string | null {
  const observer = resolveReferenceCityObserverLocation(config.chrome.displayTime);
  if (!observer) {
    return null;
  }
  return REFERENCE_CITIES.find((c) => c.id === observer.cityId)?.name ?? observer.cityId;
}

export function EventPlaybackPanel(props: {
  config: LibrationConfigV2;
  updateConfig?: UpdateConfig;
  session?: EventPlaybackSessionUi;
}): ReactElement {
  const { config, updateConfig, session } = props;
  const mutable = Boolean(updateConfig);
  const pb = config.data.eventPlayback;
  const family = pb.family;
  const eclipseBounds = getEclipseTourAuthorityRange().calendarBounds;
  const mwBounds = getMilkyWayPlaybackCalendarBounds();
  const dateBounds = family === "milkyWay" ? mwBounds : eclipseBounds;
  const eclipse = pb.eclipse;
  const mw = pb.milkyWay;
  const phase = session?.phase ?? "inactive";
  const playing = phase === "playing";
  const paused = phase === "paused";
  const active = playing || paused;
  const familiesOff =
    family === "eclipses" ? !eclipse.includeSolar && !eclipse.includeLunar : !mw.includeViewing && !mw.includeStrong && !mw.includePrime;
  const city = cityNameFromConfig(config);

  let matchingCount: number | null = 0;
  if (familiesOff) {
    matchingCount = 0;
  } else if (family === "eclipses") {
    matchingCount = buildEclipsePlaybackSchedule(config).length;
  } else {
    const start = Date.parse(`${mw.startDateYmd}T00:00:00.000Z`);
    const end = Date.parse(`${mw.endDateYmd}T00:00:00.000Z`);
    const span = Number.isFinite(start) && Number.isFinite(end) ? end - start : Infinity;
    matchingCount = span > MW_COUNT_SPAN_MS ? null : buildEventPlaybackSchedule(config).length;
  }

  const startDisabled =
    !mutable || !session || familiesOff || matchingCount === 0 || playing || (family === "milkyWay" && !city);
  const pauseDisabled = !session || !playing;
  const resetDisabled = !session || !active;
  const stopDisabled = !session || !active;
  const prevDisabled = !session || !active || !session.canGoPrevious;
  const nextDisabled = !session || !active || !session.canGoNext;

  const statusLines: string[] = [];
  if (family === "milkyWay" && !city) {
    statusLines.push("Select a reference city to sequence Milky Way windows.");
  } else if (familiesOff) {
    statusLines.push(
      family === "eclipses"
        ? "Select Solar and/or Lunar to enumerate events."
        : "Select Viewing, Strong, and/or Prime to enumerate events.",
    );
  } else if (matchingCount === null) {
    statusLines.push("Long range — Start to sequence selected windows.");
  } else if (matchingCount === 0) {
    statusLines.push(family === "eclipses" ? "No matching eclipse events" : "No matching viewing windows");
  } else {
    statusLines.push(
      family === "eclipses" ? `${matchingCount} matching events` : `${matchingCount} matching windows`,
    );
    if (active && session?.currentTitle) {
      if (family === "milkyWay") {
        statusLines.push("Milky Way");
      }
      statusLines.push(session.currentTitle);
      if (session.currentDateLabel) {
        statusLines.push(session.currentDateLabel);
      }
      for (const line of session.extraStatusLines) {
        statusLines.push(line);
      }
      statusLines.push(`Event ${session.currentIndex + 1} of ${session.eventCount}`);
    }
  }

  const familyLabel = family === "eclipses" ? "Eclipse" : "Milky Way";

  return (
    <div data-testid="event-playback-panel">
      <p className="config-section__hint">
        Sequences domain events by commanding the existing Demo clock. Layers own rendering.
        Playback does not require domain overlays to be visible.
      </p>

      <ConfigControlRow label="Event family">
        <select
          className="config-input"
          disabled={!mutable}
          aria-label="Event family"
          data-testid="event-family-select"
          value={family}
          onChange={
            mutable && updateConfig
              ? (e) => {
                  const next = e.currentTarget.value as EventPlaybackFamilyId;
                  session?.onDeactivate();
                  patchPlayback(updateConfig, (draft) => {
                    draft.data.eventPlayback = { ...draft.data.eventPlayback, family: next };
                  });
                }
              : undefined
          }
        >
          <option value="eclipses">Eclipses</option>
          <option value="milkyWay">Milky Way</option>
        </select>
      </ConfigControlRow>

      {family === "milkyWay" ? (
        <p className="config-section__hint">
          Reference city: {city ?? "none"} (playback uses this observer; it does not change Layers
          presentation).
        </p>
      ) : null}

      <ConfigControlRow label="Starting date">
        <input
          type="date"
          className="config-input"
          disabled={!mutable}
          min={dateBounds.minYmd}
          max={dateBounds.maxYmd}
          value={family === "milkyWay" ? mw.startDateYmd : eclipse.startDateYmd}
          aria-label={`${familyLabel} playback starting date`}
          onChange={
            mutable && updateConfig
              ? (e) => {
                  const startDateYmd = e.currentTarget.value;
                  session?.onDeactivate();
                  patchPlayback(updateConfig, (draft) => {
                    if (family === "milkyWay") {
                      draft.data.eventPlayback = applyEventPlaybackMilkyWay(draft.data.eventPlayback, {
                        startDateYmd,
                      });
                    } else {
                      draft.data.eventPlayback = applyEventPlaybackEclipse(draft.data.eventPlayback, {
                        startDateYmd,
                      });
                    }
                  });
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
                  const startDateYmd = eventPlaybackStartYmdFromNow(config);
                  patchPlayback(updateConfig, (draft) => {
                    if (family === "milkyWay") {
                      draft.data.eventPlayback = applyEventPlaybackMilkyWay(draft.data.eventPlayback, {
                        startDateYmd,
                      });
                    } else {
                      draft.data.eventPlayback = applyEventPlaybackEclipse(draft.data.eventPlayback, {
                        startDateYmd,
                      });
                    }
                  });
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
          value={family === "milkyWay" ? mw.endDateYmd : eclipse.endDateYmd}
          aria-label={`${familyLabel} playback end date`}
          onChange={
            mutable && updateConfig
              ? (e) => {
                  const endDateYmd = e.currentTarget.value;
                  session?.onDeactivate();
                  patchPlayback(updateConfig, (draft) => {
                    if (family === "milkyWay") {
                      draft.data.eventPlayback = applyEventPlaybackMilkyWay(draft.data.eventPlayback, {
                        endDateYmd,
                      });
                    } else {
                      draft.data.eventPlayback = applyEventPlaybackEclipse(draft.data.eventPlayback, {
                        endDateYmd,
                      });
                    }
                  });
                }
              : undefined
          }
        />
      </ConfigControlRow>

      {family === "eclipses" ? (
        <div className="config-checkbox-grid">
          <ConfigControlRow label="Solar">
            <input
              type="checkbox"
              className="config-input config-input--checkbox"
              checked={eclipse.includeSolar}
              disabled={!mutable}
              aria-label="Include solar eclipses in playback"
              onChange={
                mutable && updateConfig
                  ? (e) => {
                      session?.onDeactivate();
                      patchPlayback(updateConfig, (draft) => {
                        draft.data.eventPlayback = applyEventPlaybackEclipse(draft.data.eventPlayback, {
                          includeSolar: e.currentTarget.checked,
                        });
                      });
                    }
                  : undefined
              }
            />
          </ConfigControlRow>
          <ConfigControlRow label="Lunar">
            <input
              type="checkbox"
              className="config-input config-input--checkbox"
              checked={eclipse.includeLunar}
              disabled={!mutable}
              aria-label="Include lunar eclipses in playback"
              onChange={
                mutable && updateConfig
                  ? (e) => {
                      session?.onDeactivate();
                      patchPlayback(updateConfig, (draft) => {
                        draft.data.eventPlayback = applyEventPlaybackEclipse(draft.data.eventPlayback, {
                          includeLunar: e.currentTarget.checked,
                        });
                      });
                    }
                  : undefined
              }
            />
          </ConfigControlRow>
          <ConfigControlRow label="Loop">
            <input
              type="checkbox"
              className="config-input config-input--checkbox"
              checked={eclipse.loop}
              disabled={!mutable}
              aria-label="Loop eclipse playback"
              onChange={
                mutable && updateConfig
                  ? (e) => {
                      patchPlayback(updateConfig, (draft) => {
                        draft.data.eventPlayback = applyEventPlaybackEclipse(draft.data.eventPlayback, {
                          loop: e.currentTarget.checked,
                        });
                      });
                    }
                  : undefined
              }
            />
          </ConfigControlRow>
        </div>
      ) : (
        <div className="config-checkbox-grid">
          <ConfigControlRow label="Viewing">
            <input
              type="checkbox"
              className="config-input config-input--checkbox"
              checked={mw.includeViewing}
              disabled={!mutable}
              aria-label="Include Viewing windows in playback"
              onChange={
                mutable && updateConfig
                  ? (e) => {
                      session?.onDeactivate();
                      patchPlayback(updateConfig, (draft) => {
                        draft.data.eventPlayback = applyEventPlaybackMilkyWay(draft.data.eventPlayback, {
                          includeViewing: e.currentTarget.checked,
                        });
                      });
                    }
                  : undefined
              }
            />
          </ConfigControlRow>
          <ConfigControlRow label="Strong">
            <input
              type="checkbox"
              className="config-input config-input--checkbox"
              checked={mw.includeStrong}
              disabled={!mutable}
              aria-label="Include Strong windows in playback"
              onChange={
                mutable && updateConfig
                  ? (e) => {
                      session?.onDeactivate();
                      patchPlayback(updateConfig, (draft) => {
                        draft.data.eventPlayback = applyEventPlaybackMilkyWay(draft.data.eventPlayback, {
                          includeStrong: e.currentTarget.checked,
                        });
                      });
                    }
                  : undefined
              }
            />
          </ConfigControlRow>
          <ConfigControlRow label="Prime">
            <input
              type="checkbox"
              className="config-input config-input--checkbox"
              checked={mw.includePrime}
              disabled={!mutable}
              aria-label="Include Prime windows in playback"
              onChange={
                mutable && updateConfig
                  ? (e) => {
                      session?.onDeactivate();
                      patchPlayback(updateConfig, (draft) => {
                        draft.data.eventPlayback = applyEventPlaybackMilkyWay(draft.data.eventPlayback, {
                          includePrime: e.currentTarget.checked,
                        });
                      });
                    }
                  : undefined
              }
            />
          </ConfigControlRow>
          <ConfigControlRow label="Loop">
            <input
              type="checkbox"
              className="config-input config-input--checkbox"
              checked={mw.loop}
              disabled={!mutable}
              aria-label="Loop Milky Way playback"
              onChange={
                mutable && updateConfig
                  ? (e) => {
                      patchPlayback(updateConfig, (draft) => {
                        draft.data.eventPlayback = applyEventPlaybackMilkyWay(draft.data.eventPlayback, {
                          loop: e.currentTarget.checked,
                        });
                      });
                    }
                  : undefined
              }
            />
          </ConfigControlRow>
        </div>
      )}

      <ConfigControlRow label="Start before event">
        <select
          className="config-input"
          disabled={!mutable}
          aria-label="Start before event"
          value={family === "milkyWay" ? mw.leadInId : eclipse.leadInId}
          onChange={
            mutable && updateConfig
              ? (e) => {
                  session?.onDeactivate();
                  const leadInId = e.currentTarget.value as EventPlaybackOffsetId;
                  patchPlayback(updateConfig, (draft) => {
                    if (family === "milkyWay") {
                      draft.data.eventPlayback = applyEventPlaybackMilkyWay(draft.data.eventPlayback, {
                        leadInId,
                      });
                    } else {
                      draft.data.eventPlayback = applyEventPlaybackEclipse(draft.data.eventPlayback, {
                        leadInId,
                      });
                    }
                  });
                }
              : undefined
          }
        >
          {EVENT_PLAYBACK_OFFSET_IDS.map((id) => (
            <option key={id} value={id}>
              {eventPlaybackOffsetLabel(id)}
            </option>
          ))}
        </select>
      </ConfigControlRow>
      <ConfigControlRow label="Continue after event">
        <select
          className="config-input"
          disabled={!mutable}
          aria-label="Continue after event"
          value={family === "milkyWay" ? mw.postWaitId : eclipse.postWaitId}
          onChange={
            mutable && updateConfig
              ? (e) => {
                  session?.onDeactivate();
                  const postWaitId = e.currentTarget.value as EventPlaybackOffsetId;
                  patchPlayback(updateConfig, (draft) => {
                    if (family === "milkyWay") {
                      draft.data.eventPlayback = applyEventPlaybackMilkyWay(draft.data.eventPlayback, {
                        postWaitId,
                      });
                    } else {
                      draft.data.eventPlayback = applyEventPlaybackEclipse(draft.data.eventPlayback, {
                        postWaitId,
                      });
                    }
                  });
                }
              : undefined
          }
        >
          {EVENT_PLAYBACK_OFFSET_IDS.map((id) => (
            <option key={id} value={id}>
              {eventPlaybackOffsetLabel(id)}
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
          aria-label="Event playback speed"
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
              aria-label={`Resume ${familyLabel} playback`}
              onClick={() => session?.onStart()}
            >
              Resume
            </button>
          ) : (
            <button
              type="button"
              className="config-button config-button--primary"
              disabled={startDisabled}
              aria-label={`Start ${familyLabel} playback`}
              onClick={() => session?.onStart()}
            >
              Start
            </button>
          )}
          <button
            type="button"
            className="config-button"
            disabled={pauseDisabled}
            aria-label={`Pause ${familyLabel} playback`}
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
            aria-label={`Stop ${familyLabel} playback`}
            onClick={() => session?.onStop()}
          >
            Stop
          </button>
        </div>
      </ConfigControlRow>
    </div>
  );
}
