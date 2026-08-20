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
import { eventPlaybackStartYmdFromNow } from "../../app/eventPlaybackRuntime";
import {
  DEMO_TIME_SPEED_MAX,
  DEMO_TIME_SPEED_MIN,
} from "../../config/appConfig";
import type { LibrationConfigV2 } from "../../config/v2/librationConfig";
import {
  applyEventPlayback,
  eventPlaybackStartBlockedReason,
  getEventPlaybackCalendarBounds,
} from "../../core/eventPlayback/eventPlaybackConfig";
import {
  EVENT_PLAYBACK_OFFSET_IDS,
  eventPlaybackOffsetLabel,
  type EventPlaybackOffsetId,
} from "../../core/eventPlayback/eventPlaybackOffsets";
import type { EventPlaybackPhase } from "../../core/eventPlayback/eventPlaybackSequence";
import { resolveReferenceCityObserverLocation } from "../../core/referenceCityObserver";
import { REFERENCE_CITIES } from "../../data/referenceCities";
import { ConfigControlRow } from "./ConfigControlRow";

type UpdateConfig = (updater: (draft: LibrationConfigV2) => void) => void;

export type EventPlaybackSessionUi = {
  phase: EventPlaybackPhase;
  currentIndex: number;
  eventCount: number | null;
  currentTitle: string | null;
  currentDateLabel: string | null;
  extraStatusLines: readonly string[];
  emptyMessage: string | null;
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
  const dateBounds = getEventPlaybackCalendarBounds();
  const phase = session?.phase ?? "inactive";
  const playing = phase === "playing";
  const paused = phase === "paused";
  const active = playing || paused;
  const city = cityNameFromConfig(config);
  const blocked = eventPlaybackStartBlockedReason(pb, Boolean(city));
  const startDisabled = !mutable || !session || Boolean(blocked) || playing;
  const pauseDisabled = !session || !playing;
  const resetDisabled = !session || !active;
  const stopDisabled = !session || !active;
  const prevDisabled = !session || !active || !session.canGoPrevious;
  const nextDisabled = !session || !active || !session.canGoNext;

  const statusLines: string[] = [];
  if (blocked) {
    statusLines.push(blocked);
  } else if (session?.emptyMessage) {
    statusLines.push(session.emptyMessage);
  }
  if (active && session?.currentTitle) {
    statusLines.push(session.currentTitle);
    if (session.currentDateLabel) {
      statusLines.push(session.currentDateLabel);
    }
    for (const line of session.extraStatusLines) {
      statusLines.push(line);
    }
    statusLines.push(`Event ${session.currentIndex + 1}`);
  } else if (!blocked && !session?.emptyMessage) {
    statusLines.push("Start to sequence the selected event types.");
  }

  return (
    <div data-testid="event-playback-panel">
      <p className="config-section__hint">
        Sequences domain events by commanding the existing Demo clock. Layers own rendering.
        Playback does not require domain overlays to be visible.
      </p>
      <p className="config-section__hint">
        Solar and lunar catalogs cover roughly 1900–2100. Milky Way viewing windows cover 1600–2500.
        Each source reports no events outside its authority.
      </p>

      <ConfigControlRow label="Starting date">
        <input
          type="date"
          className="config-input"
          disabled={!mutable}
          min={dateBounds.minYmd}
          max={dateBounds.maxYmd}
          value={pb.startDateYmd}
          aria-label="Event playback starting date"
          onChange={
            mutable && updateConfig
              ? (e) => {
                  session?.onDeactivate();
                  patchPlayback(updateConfig, (draft) => {
                    draft.data.eventPlayback = applyEventPlayback(draft.data.eventPlayback, {
                      startDateYmd: e.currentTarget.value,
                    });
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
                    draft.data.eventPlayback = applyEventPlayback(draft.data.eventPlayback, {
                      startDateYmd,
                    });
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
          value={pb.endDateYmd}
          aria-label="Event playback end date"
          onChange={
            mutable && updateConfig
              ? (e) => {
                  session?.onDeactivate();
                  patchPlayback(updateConfig, (draft) => {
                    draft.data.eventPlayback = applyEventPlayback(draft.data.eventPlayback, {
                      endDateYmd: e.currentTarget.value,
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
          checked={pb.loop}
          disabled={!mutable}
          aria-label="Loop event playback"
          onChange={
            mutable && updateConfig
              ? (e) => {
                  patchPlayback(updateConfig, (draft) => {
                    draft.data.eventPlayback = applyEventPlayback(draft.data.eventPlayback, {
                      loop: e.currentTarget.checked,
                    });
                  });
                }
              : undefined
          }
        />
      </ConfigControlRow>

      <p className="config-section__hint">Event types</p>
      <div className="config-checkbox-grid">
        <ConfigControlRow label="Solar eclipses">
          <input
            type="checkbox"
            className="config-input config-input--checkbox"
            checked={pb.solarEnabled}
            disabled={!mutable}
            aria-label="Include solar eclipses in playback"
            onChange={
              mutable && updateConfig
                ? (e) => {
                    session?.onDeactivate();
                    patchPlayback(updateConfig, (draft) => {
                      draft.data.eventPlayback = applyEventPlayback(draft.data.eventPlayback, {
                        solarEnabled: e.currentTarget.checked,
                      });
                    });
                  }
                : undefined
            }
          />
        </ConfigControlRow>
        <ConfigControlRow label="Lunar eclipses">
          <input
            type="checkbox"
            className="config-input config-input--checkbox"
            checked={pb.lunarEnabled}
            disabled={!mutable}
            aria-label="Include lunar eclipses in playback"
            onChange={
              mutable && updateConfig
                ? (e) => {
                    session?.onDeactivate();
                    patchPlayback(updateConfig, (draft) => {
                      draft.data.eventPlayback = applyEventPlayback(draft.data.eventPlayback, {
                        lunarEnabled: e.currentTarget.checked,
                      });
                    });
                  }
                : undefined
            }
          />
        </ConfigControlRow>
        <ConfigControlRow label="Milky Way viewing windows">
          <input
            type="checkbox"
            className="config-input config-input--checkbox"
            checked={pb.milkyWayEnabled}
            disabled={!mutable}
            aria-label="Include Milky Way viewing windows in playback"
            onChange={
              mutable && updateConfig
                ? (e) => {
                    session?.onDeactivate();
                    patchPlayback(updateConfig, (draft) => {
                      draft.data.eventPlayback = applyEventPlayback(draft.data.eventPlayback, {
                        milkyWayEnabled: e.currentTarget.checked,
                      });
                    });
                  }
                : undefined
            }
          />
        </ConfigControlRow>
      </div>

      {pb.milkyWayEnabled ? (
        <>
          <p className="config-section__hint">
            Reference city: {city ?? "none"} (playback uses this observer; it does not change Layers
            presentation).
          </p>
          <p className="config-section__hint">Milky Way levels</p>
          <div className="config-checkbox-grid">
            <ConfigControlRow label="Viewing">
              <input
                type="checkbox"
                className="config-input config-input--checkbox"
                checked={pb.includeViewing}
                disabled={!mutable}
                aria-label="Include Viewing windows in playback"
                onChange={
                  mutable && updateConfig
                    ? (e) => {
                        session?.onDeactivate();
                        patchPlayback(updateConfig, (draft) => {
                          draft.data.eventPlayback = applyEventPlayback(draft.data.eventPlayback, {
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
                checked={pb.includeStrong}
                disabled={!mutable}
                aria-label="Include Strong windows in playback"
                onChange={
                  mutable && updateConfig
                    ? (e) => {
                        session?.onDeactivate();
                        patchPlayback(updateConfig, (draft) => {
                          draft.data.eventPlayback = applyEventPlayback(draft.data.eventPlayback, {
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
                checked={pb.includePrime}
                disabled={!mutable}
                aria-label="Include Prime windows in playback"
                onChange={
                  mutable && updateConfig
                    ? (e) => {
                        session?.onDeactivate();
                        patchPlayback(updateConfig, (draft) => {
                          draft.data.eventPlayback = applyEventPlayback(draft.data.eventPlayback, {
                            includePrime: e.currentTarget.checked,
                          });
                        });
                      }
                    : undefined
                }
              />
            </ConfigControlRow>
          </div>
        </>
      ) : null}

      <ConfigControlRow label="Start before event">
        <select
          className="config-input"
          disabled={!mutable}
          aria-label="Start before event"
          value={pb.leadInId}
          onChange={
            mutable && updateConfig
              ? (e) => {
                  session?.onDeactivate();
                  patchPlayback(updateConfig, (draft) => {
                    draft.data.eventPlayback = applyEventPlayback(draft.data.eventPlayback, {
                      leadInId: e.currentTarget.value as EventPlaybackOffsetId,
                    });
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
          value={pb.postWaitId}
          onChange={
            mutable && updateConfig
              ? (e) => {
                  session?.onDeactivate();
                  patchPlayback(updateConfig, (draft) => {
                    draft.data.eventPlayback = applyEventPlayback(draft.data.eventPlayback, {
                      postWaitId: e.currentTarget.value as EventPlaybackOffsetId,
                    });
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
              aria-label="Resume event playback"
              onClick={() => session?.onStart()}
            >
              Resume
            </button>
          ) : (
            <button
              type="button"
              className="config-button config-button--primary"
              disabled={startDisabled}
              aria-label="Start event playback"
              onClick={() => session?.onStart()}
            >
              Start
            </button>
          )}
          <button
            type="button"
            className="config-button"
            disabled={pauseDisabled}
            aria-label="Pause event playback"
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
            aria-label="Stop event playback"
            onClick={() => session?.onStop()}
          >
            Stop
          </button>
        </div>
      </ConfigControlRow>
    </div>
  );
}
