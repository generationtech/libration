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
 */

import type { EclipseTourScheduledEvent } from "./eclipseTourCatalog";

export type EclipseTourPhase = "inactive" | "playing" | "paused";

export type EclipseTourSequenceState = {
  readonly phase: EclipseTourPhase;
  readonly events: readonly EclipseTourScheduledEvent[];
  readonly index: number;
  readonly loop: boolean;
  /** Demo `startIsoUtc` last written by the tour; used to detect foreign Demo start edits. */
  readonly ownedStartIsoUtc: string | null;
  readonly structuralKey: string;
};

export type EclipseTourStepResult = {
  readonly state: EclipseTourSequenceState;
  /** When set, App must apply this as Demo `startIsoUtc` (and keep play/pause). */
  readonly jumpToIsoUtc: string | null;
  /** When true, Demo should pause after applying any jump. */
  readonly pause: boolean;
};

export function inactiveEclipseTourState(structuralKey: string = ""): EclipseTourSequenceState {
  return {
    phase: "inactive",
    events: [],
    index: 0,
    loop: true,
    ownedStartIsoUtc: null,
    structuralKey,
  };
}

export function isoUtcFromUnixMs(utcMs: number): string {
  return new Date(utcMs).toISOString();
}

function atIndex(
  state: EclipseTourSequenceState,
  index: number,
  phase: EclipseTourPhase,
): EclipseTourSequenceState {
  const event = state.events[index];
  if (!event) {
    return { ...inactiveEclipseTourState(state.structuralKey), loop: state.loop };
  }
  return {
    ...state,
    phase,
    index,
    ownedStartIsoUtc: isoUtcFromUnixMs(event.leadInUtcMs),
  };
}

export function startEclipseTourSequence(
  events: readonly EclipseTourScheduledEvent[],
  loop: boolean,
  structuralKey: string,
): EclipseTourStepResult {
  if (events.length === 0) {
    return {
      state: { ...inactiveEclipseTourState(structuralKey), loop },
      jumpToIsoUtc: null,
      pause: false,
    };
  }
  const state: EclipseTourSequenceState = {
    phase: "playing",
    events,
    index: 0,
    loop,
    ownedStartIsoUtc: isoUtcFromUnixMs(events[0]!.leadInUtcMs),
    structuralKey,
  };
  return { state, jumpToIsoUtc: state.ownedStartIsoUtc, pause: false };
}

export function pauseEclipseTourSequence(state: EclipseTourSequenceState): EclipseTourSequenceState {
  if (state.phase !== "playing") {
    return state;
  }
  return { ...state, phase: "paused" };
}

export function resumeEclipseTourSequence(state: EclipseTourSequenceState): EclipseTourSequenceState {
  if (state.phase !== "paused" || state.events.length === 0) {
    return state;
  }
  return { ...state, phase: "playing" };
}

export function stopEclipseTourSequence(state: EclipseTourSequenceState): EclipseTourSequenceState {
  return { ...inactiveEclipseTourState(state.structuralKey), loop: state.loop };
}

export function resetEclipseTourCurrentEvent(state: EclipseTourSequenceState): EclipseTourStepResult {
  if (state.phase === "inactive" || state.events.length === 0) {
    return { state, jumpToIsoUtc: null, pause: false };
  }
  const event = state.events[state.index];
  if (!event) {
    return { state: stopEclipseTourSequence(state), jumpToIsoUtc: null, pause: false };
  }
  const next: EclipseTourSequenceState = {
    ...state,
    ownedStartIsoUtc: isoUtcFromUnixMs(event.leadInUtcMs),
  };
  return { state: next, jumpToIsoUtc: next.ownedStartIsoUtc, pause: false };
}

function wrapIndex(index: number, length: number, loop: boolean): number | null {
  if (length === 0) {
    return null;
  }
  if (index >= 0 && index < length) {
    return index;
  }
  if (!loop) {
    return null;
  }
  const mod = ((index % length) + length) % length;
  return mod;
}

export function skipEclipseTourEvent(
  state: EclipseTourSequenceState,
  delta: number,
): EclipseTourStepResult {
  if (state.phase === "inactive" || state.events.length === 0) {
    return { state, jumpToIsoUtc: null, pause: false };
  }
  const target = wrapIndex(state.index + delta, state.events.length, state.loop);
  if (target === null) {
    return { state, jumpToIsoUtc: null, pause: false };
  }
  const next = atIndex(state, target, state.phase);
  return { state: next, jumpToIsoUtc: next.ownedStartIsoUtc, pause: false };
}

export function eclipseTourCanGoPrevious(state: EclipseTourSequenceState): boolean {
  if (state.phase === "inactive" || state.events.length === 0) {
    return false;
  }
  return state.loop || state.index > 0;
}

export function eclipseTourCanGoNext(state: EclipseTourSequenceState): boolean {
  if (state.phase === "inactive" || state.events.length === 0) {
    return false;
  }
  return state.loop || state.index < state.events.length - 1;
}

/**
 * Advance while playing. At most one event transition per call.
 * Forward playback never rewinds except loop final→first.
 */
export function stepEclipseTourSequence(
  state: EclipseTourSequenceState,
  productUtcMs: number,
): EclipseTourStepResult {
  if (state.phase !== "playing" || state.events.length === 0) {
    return { state, jumpToIsoUtc: null, pause: false };
  }
  const current = state.events[state.index];
  if (!current) {
    return { state: stopEclipseTourSequence(state), jumpToIsoUtc: null, pause: false };
  }
  if (productUtcMs < current.transitionEndUtcMs) {
    return { state, jumpToIsoUtc: null, pause: false };
  }

  const lastIndex = state.events.length - 1;
  if (state.index >= lastIndex) {
    if (!state.loop) {
      return {
        state: { ...state, phase: "paused", ownedStartIsoUtc: isoUtcFromUnixMs(current.transitionEndUtcMs) },
        jumpToIsoUtc: isoUtcFromUnixMs(current.transitionEndUtcMs),
        pause: true,
      };
    }
    const first = state.events[0]!;
    const next = atIndex(state, 0, "playing");
    return { state: next, jumpToIsoUtc: isoUtcFromUnixMs(first.leadInUtcMs), pause: false };
  }

  let nextIndex = state.index + 1;
  while (nextIndex < state.events.length) {
    const candidate = state.events[nextIndex]!;
    if (productUtcMs < candidate.transitionEndUtcMs) {
      const jumpMs = Math.max(productUtcMs, candidate.leadInUtcMs);
      const next: EclipseTourSequenceState = {
        ...state,
        index: nextIndex,
        ownedStartIsoUtc: isoUtcFromUnixMs(jumpMs),
      };
      return { state: next, jumpToIsoUtc: next.ownedStartIsoUtc, pause: false };
    }
    nextIndex += 1;
  }

  if (state.loop) {
    const first = state.events[0]!;
    const next = atIndex(state, 0, "playing");
    return { state: next, jumpToIsoUtc: isoUtcFromUnixMs(first.leadInUtcMs), pause: false };
  }
  const last = state.events[lastIndex]!;
  return {
    state: { ...state, index: lastIndex, phase: "paused", ownedStartIsoUtc: isoUtcFromUnixMs(last.transitionEndUtcMs) },
    jumpToIsoUtc: isoUtcFromUnixMs(last.transitionEndUtcMs),
    pause: true,
  };
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
