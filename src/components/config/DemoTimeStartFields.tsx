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

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { TopBandTimeMode } from "../../config/appConfig";
import {
  demoStartTimeFieldPlaceholder,
  demoTimeStartIsoUtcNow,
  demoStartCalendarDateFromCommittedIso,
  demoStartEditableTimeTextFromCommittedIso,
  mergeDemoWallTimeTextIntoCommittedIso,
  mergeDemoWallYmdIntoCommittedIso,
} from "./demoTimeStartIso";

export type DemoTimeStartFieldsProps = {
  committedStartIsoUtc: string;
  topBandMode: TopBandTimeMode;
  /** Resolved IANA zone from `chrome.displayTime.referenceTimeZone` (same as bottom-bar wall clock). */
  resolvedReferenceTimeZone: string;
  disabled: boolean;
  onCommit: (startIsoUtc: string) => void;
};

export function DemoTimeStartFields({
  committedStartIsoUtc,
  topBandMode,
  resolvedReferenceTimeZone,
  disabled,
  onCommit,
}: DemoTimeStartFieldsProps) {
  const dateId = useId();
  const timeId = useId();
  const [timeFocused, setTimeFocused] = useState(false);
  const [timeDraft, setTimeDraft] = useState(() =>
    demoStartEditableTimeTextFromCommittedIso(
      committedStartIsoUtc,
      topBandMode,
      resolvedReferenceTimeZone,
    ),
  );
  const skipTimeCommitOnBlurRef = useRef(false);
  const prevCommittedRef = useRef(committedStartIsoUtc);

  useEffect(() => {
    if (prevCommittedRef.current !== committedStartIsoUtc) {
      prevCommittedRef.current = committedStartIsoUtc;
      setTimeDraft(
        demoStartEditableTimeTextFromCommittedIso(
          committedStartIsoUtc,
          topBandMode,
          resolvedReferenceTimeZone,
        ),
      );
      return;
    }
    if (!timeFocused) {
      setTimeDraft(
        demoStartEditableTimeTextFromCommittedIso(
          committedStartIsoUtc,
          topBandMode,
          resolvedReferenceTimeZone,
        ),
      );
    }
  }, [committedStartIsoUtc, topBandMode, resolvedReferenceTimeZone, timeFocused]);

  const commitTimeDraftIfValid = useCallback(() => {
    const merged = mergeDemoWallTimeTextIntoCommittedIso(
      committedStartIsoUtc,
      timeDraft,
      topBandMode,
      resolvedReferenceTimeZone,
    );
    if (merged) {
      onCommit(merged);
    }
  }, [timeDraft, committedStartIsoUtc, topBandMode, resolvedReferenceTimeZone, onCommit]);

  const handleTimeBlur = () => {
    if (!skipTimeCommitOnBlurRef.current) {
      commitTimeDraftIfValid();
    }
    skipTimeCommitOnBlurRef.current = false;
    setTimeFocused(false);
  };

  const handleTimeKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitTimeDraftIfValid();
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      skipTimeCommitOnBlurRef.current = true;
      setTimeDraft(
        demoStartEditableTimeTextFromCommittedIso(
          committedStartIsoUtc,
          topBandMode,
          resolvedReferenceTimeZone,
        ),
      );
      e.currentTarget.blur();
    }
  };

  const dateValue = demoStartCalendarDateFromCommittedIso(
    committedStartIsoUtc,
    topBandMode,
    resolvedReferenceTimeZone,
  );
  const timeDisplay = demoStartEditableTimeTextFromCommittedIso(
    committedStartIsoUtc,
    topBandMode,
    resolvedReferenceTimeZone,
  );

  return (
    <div className="config-demo-start-fields">
      <div className="config-demo-start-fields__stack">
        <div className="config-demo-start-fields__row">
          <label className="config-demo-start-fields__label" htmlFor={dateId}>
            Demo start date
          </label>
          <input
            id={dateId}
            type="date"
            className="config-input config-demo-start-fields__date"
            value={dateValue ?? ""}
            disabled={disabled || dateValue === null}
            aria-label="Demo start date"
            onChange={(e) => {
              const ymd = e.currentTarget.value;
              if (!ymd) {
                return;
              }
              const merged = mergeDemoWallYmdIntoCommittedIso(
                committedStartIsoUtc,
                ymd,
                topBandMode,
                resolvedReferenceTimeZone,
              );
              if (merged) {
                onCommit(merged);
              }
            }}
          />
        </div>
        <div className="config-demo-start-fields__row">
          <label className="config-demo-start-fields__label" htmlFor={timeId}>
            Demo start time
          </label>
          <input
            id={timeId}
            type="text"
            className="config-input config-demo-start-fields__time"
            value={timeFocused ? timeDraft : timeDisplay}
            readOnly={disabled}
            disabled={disabled}
            autoComplete="off"
            spellCheck={false}
            placeholder={demoStartTimeFieldPlaceholder(topBandMode)}
            aria-label="Demo start time"
            onFocus={() => {
              setTimeFocused(true);
              setTimeDraft(
                demoStartEditableTimeTextFromCommittedIso(
                  committedStartIsoUtc,
                  topBandMode,
                  resolvedReferenceTimeZone,
                ),
              );
            }}
            onChange={(e) => setTimeDraft(e.currentTarget.value)}
            onBlur={handleTimeBlur}
            onKeyDown={handleTimeKeyDown}
          />
        </div>
        <div className="config-demo-start-fields__row config-demo-start-fields__row--action">
          <button
            type="button"
            className="config-button"
            disabled={disabled}
            aria-label="Set demo start to current time"
            onClick={() => {
              onCommit(demoTimeStartIsoUtcNow());
            }}
          >
            Use current time
          </button>
        </div>
        <p className="config-demo-start-fields__hint">
          Date and time follow the same display-time reference as the instrument clock (UTC when the clock shows UTC;
          otherwise the configured reference timezone). The value is stored as one UTC instant.
        </p>
      </div>
    </div>
  );
}
