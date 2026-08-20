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

/**
 * Headless Eclipse Tour sequencer. Issues Demo start-instant jumps; does not own a clock.
 * Implementation is the shared event-playback sequencer.
 */

import type { EclipseTourScheduledEvent } from "./eclipseTourCatalog";
import {
  eventPlaybackCanGoNext,
  eventPlaybackCanGoPrevious,
  inactiveEventPlaybackState,
  isoUtcFromUnixMs,
  pauseEventPlaybackSequence,
  resetEventPlaybackCurrentEvent,
  resumeEventPlaybackSequence,
  skipEventPlaybackEvent,
  startEventPlaybackSequence,
  stepEventPlaybackSequence,
  stopEventPlaybackSequence,
  type EventPlaybackPhase,
  type EventPlaybackSequenceState,
  type EventPlaybackStepResult,
} from "../eventPlayback/eventPlaybackSequence";

export type EclipseTourPhase = EventPlaybackPhase;

export type EclipseTourSequenceState = EventPlaybackSequenceState<EclipseTourScheduledEvent>;

export type EclipseTourStepResult = EventPlaybackStepResult<EclipseTourScheduledEvent>;

export function inactiveEclipseTourState(structuralKey: string = ""): EclipseTourSequenceState {
  return inactiveEventPlaybackState(structuralKey);
}

export { isoUtcFromUnixMs };

export function startEclipseTourSequence(
  events: readonly EclipseTourScheduledEvent[],
  loop: boolean,
  structuralKey: string,
): EclipseTourStepResult {
  return startEventPlaybackSequence(events, loop, structuralKey);
}

export function pauseEclipseTourSequence(state: EclipseTourSequenceState): EclipseTourSequenceState {
  return pauseEventPlaybackSequence(state);
}

export function resumeEclipseTourSequence(state: EclipseTourSequenceState): EclipseTourSequenceState {
  return resumeEventPlaybackSequence(state);
}

export function stopEclipseTourSequence(state: EclipseTourSequenceState): EclipseTourSequenceState {
  return stopEventPlaybackSequence(state);
}

export function resetEclipseTourCurrentEvent(state: EclipseTourSequenceState): EclipseTourStepResult {
  return resetEventPlaybackCurrentEvent(state);
}

export function skipEclipseTourEvent(
  state: EclipseTourSequenceState,
  delta: number,
): EclipseTourStepResult {
  return skipEventPlaybackEvent(state, delta);
}

export function eclipseTourCanGoPrevious(state: EclipseTourSequenceState): boolean {
  return eventPlaybackCanGoPrevious(state);
}

export function eclipseTourCanGoNext(state: EclipseTourSequenceState): boolean {
  return eventPlaybackCanGoNext(state);
}

export function stepEclipseTourSequence(
  state: EclipseTourSequenceState,
  productUtcMs: number,
): EclipseTourStepResult {
  return stepEventPlaybackSequence(state, productUtcMs);
}

export function eclipseTourStructuralKey(parts: {
  readonly startDateYmd: string;
  readonly endDateYmd: string;
  readonly includeSolar: boolean;
  readonly includeLunar: boolean;
  readonly leadInId: string;
  readonly postWaitId: string;
  readonly solarTypes: string;
  readonly lunarTypes: string;
}): string {
  return [
    parts.startDateYmd,
    parts.endDateYmd,
    parts.includeSolar ? "S" : "",
    parts.includeLunar ? "L" : "",
    parts.leadInId,
    parts.postWaitId,
    parts.solarTypes,
    parts.lunarTypes,
  ].join("|");
}
