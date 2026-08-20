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
 * Headless event-playback sequencer. Issues Demo start-instant jumps; does not own a clock.
 * Family adapters supply timed events. This module does not know eclipse or Milky Way astronomy.
 */

export type EventPlaybackPhase = "inactive" | "playing" | "paused";

export type EventPlaybackTimedEvent = {
  readonly leadInUtcMs: number;
  readonly transitionEndUtcMs: number;
  readonly title?: string;
  readonly dateLabel?: string;
};

export type EventPlaybackSequenceState<T extends EventPlaybackTimedEvent = EventPlaybackTimedEvent> = {
  readonly phase: EventPlaybackPhase;
  readonly events: readonly T[];
  readonly index: number;
  readonly loop: boolean;
  /** Demo `startIsoUtc` last written by playback; used to detect foreign Demo start edits. */
  readonly ownedStartIsoUtc: string | null;
  readonly structuralKey: string;
};

export type EventPlaybackStepResult<T extends EventPlaybackTimedEvent = EventPlaybackTimedEvent> = {
  readonly state: EventPlaybackSequenceState<T>;
  /** When set, App must apply this as Demo `startIsoUtc` (and keep play/pause). */
  readonly jumpToIsoUtc: string | null;
  /** When true, Demo should pause after applying any jump. */
  readonly pause: boolean;
};

export function inactiveEventPlaybackState<T extends EventPlaybackTimedEvent>(
  structuralKey: string = "",
): EventPlaybackSequenceState<T> {
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

function atIndex<T extends EventPlaybackTimedEvent>(
  state: EventPlaybackSequenceState<T>,
  index: number,
  phase: EventPlaybackPhase,
): EventPlaybackSequenceState<T> {
  const event = state.events[index];
  if (!event) {
    return { ...inactiveEventPlaybackState<T>(state.structuralKey), loop: state.loop };
  }
  return {
    ...state,
    phase,
    index,
    ownedStartIsoUtc: isoUtcFromUnixMs(event.leadInUtcMs),
  };
}

export function startEventPlaybackSequence<T extends EventPlaybackTimedEvent>(
  events: readonly T[],
  loop: boolean,
  structuralKey: string,
): EventPlaybackStepResult<T> {
  if (events.length === 0) {
    return {
      state: { ...inactiveEventPlaybackState<T>(structuralKey), loop },
      jumpToIsoUtc: null,
      pause: false,
    };
  }
  const state: EventPlaybackSequenceState<T> = {
    phase: "playing",
    events,
    index: 0,
    loop,
    ownedStartIsoUtc: isoUtcFromUnixMs(events[0]!.leadInUtcMs),
    structuralKey,
  };
  return { state, jumpToIsoUtc: state.ownedStartIsoUtc, pause: false };
}

export function pauseEventPlaybackSequence<T extends EventPlaybackTimedEvent>(
  state: EventPlaybackSequenceState<T>,
): EventPlaybackSequenceState<T> {
  if (state.phase !== "playing") {
    return state;
  }
  return { ...state, phase: "paused" };
}

export function resumeEventPlaybackSequence<T extends EventPlaybackTimedEvent>(
  state: EventPlaybackSequenceState<T>,
): EventPlaybackSequenceState<T> {
  if (state.phase !== "paused" || state.events.length === 0) {
    return state;
  }
  return { ...state, phase: "playing" };
}

export function stopEventPlaybackSequence<T extends EventPlaybackTimedEvent>(
  state: EventPlaybackSequenceState<T>,
): EventPlaybackSequenceState<T> {
  return { ...inactiveEventPlaybackState<T>(state.structuralKey), loop: state.loop };
}

export function resetEventPlaybackCurrentEvent<T extends EventPlaybackTimedEvent>(
  state: EventPlaybackSequenceState<T>,
): EventPlaybackStepResult<T> {
  if (state.phase === "inactive" || state.events.length === 0) {
    return { state, jumpToIsoUtc: null, pause: false };
  }
  const event = state.events[state.index];
  if (!event) {
    return { state: stopEventPlaybackSequence(state), jumpToIsoUtc: null, pause: false };
  }
  const next: EventPlaybackSequenceState<T> = {
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

export function skipEventPlaybackEvent<T extends EventPlaybackTimedEvent>(
  state: EventPlaybackSequenceState<T>,
  delta: number,
): EventPlaybackStepResult<T> {
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

export function eventPlaybackCanGoPrevious<T extends EventPlaybackTimedEvent>(
  state: EventPlaybackSequenceState<T>,
): boolean {
  if (state.phase === "inactive" || state.events.length === 0) {
    return false;
  }
  return state.loop || state.index > 0;
}

export function eventPlaybackCanGoNext<T extends EventPlaybackTimedEvent>(
  state: EventPlaybackSequenceState<T>,
): boolean {
  if (state.phase === "inactive" || state.events.length === 0) {
    return false;
  }
  return state.loop || state.index < state.events.length - 1;
}

/**
 * Advance while playing. At most one event transition per call.
 * Forward playback never rewinds except loop final→first.
 */
export function stepEventPlaybackSequence<T extends EventPlaybackTimedEvent>(
  state: EventPlaybackSequenceState<T>,
  productUtcMs: number,
): EventPlaybackStepResult<T> {
  if (state.phase !== "playing" || state.events.length === 0) {
    return { state, jumpToIsoUtc: null, pause: false };
  }
  const current = state.events[state.index];
  if (!current) {
    return { state: stopEventPlaybackSequence(state), jumpToIsoUtc: null, pause: false };
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
      const next: EventPlaybackSequenceState<T> = {
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

export function eventPlaybackShouldDeactivate<T extends EventPlaybackTimedEvent>(
  state: EventPlaybackSequenceState<T>,
  demoActive: boolean,
  currentStartIsoUtc: string,
  structuralKey: string,
): boolean {
  if (state.phase === "inactive") {
    return false;
  }
  if (!demoActive) {
    return true;
  }
  if (state.ownedStartIsoUtc !== null && currentStartIsoUtc !== state.ownedStartIsoUtc) {
    return true;
  }
  if (state.structuralKey !== structuralKey) {
    return true;
  }
  return false;
}
