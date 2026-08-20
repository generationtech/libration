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
 * Holds the current event only. Neighbours come from a navigator (merged source lookup).
 */

export type EventPlaybackPhase = "inactive" | "playing" | "paused";

export type EventPlaybackTimedEvent = {
  readonly leadInUtcMs: number;
  readonly transitionEndUtcMs: number;
  readonly eventId?: string;
  readonly title?: string;
  readonly dateLabel?: string;
};

export type EventPlaybackSequenceState<T extends EventPlaybackTimedEvent = EventPlaybackTimedEvent> = {
  readonly phase: EventPlaybackPhase;
  readonly current: T | null;
  /** 0-based ordinal of the current event in this session (Previous decrements). */
  readonly index: number;
  readonly loop: boolean;
  /** Demo `startIsoUtc` last written by playback; used to detect foreign Demo start edits. */
  readonly ownedStartIsoUtc: string | null;
  readonly structuralKey: string;
  readonly hasPrevious: boolean;
  readonly hasNext: boolean;
};

export type EventPlaybackNavigator<T extends EventPlaybackTimedEvent> = {
  findNext(current: T): T | null;
  findPrevious(current: T): T | null;
  findEarliest(): T | null;
  findLatest(): T | null;
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
    current: null,
    index: 0,
    loop: true,
    ownedStartIsoUtc: null,
    structuralKey,
    hasPrevious: false,
    hasNext: false,
  };
}

export function isoUtcFromUnixMs(utcMs: number): string {
  return new Date(utcMs).toISOString();
}

function eventKey<T extends EventPlaybackTimedEvent>(event: T): string {
  return event.eventId ?? `${event.leadInUtcMs}|${event.transitionEndUtcMs}|${event.title ?? ""}`;
}

export function eventPlaybackNavigatorFromArray<T extends EventPlaybackTimedEvent>(
  events: readonly T[],
): EventPlaybackNavigator<T> {
  const indexOf = (event: T): number => events.findIndex((e) => eventKey(e) === eventKey(event));
  return {
    findNext(current) {
      const i = indexOf(current);
      if (i < 0 || i + 1 >= events.length) {
        return null;
      }
      return events[i + 1] ?? null;
    },
    findPrevious(current) {
      const i = indexOf(current);
      if (i <= 0) {
        return null;
      }
      return events[i - 1] ?? null;
    },
    findEarliest() {
      return events[0] ?? null;
    },
    findLatest() {
      return events.length === 0 ? null : events[events.length - 1]!;
    },
  };
}

function adopt<T extends EventPlaybackTimedEvent>(
  state: EventPlaybackSequenceState<T>,
  event: T,
  phase: EventPlaybackPhase,
  index: number,
  navigator: EventPlaybackNavigator<T> | null,
  jumpMs: number,
): EventPlaybackSequenceState<T> {
  const loop = state.loop;
  const hasPrevious = loop || Boolean(navigator?.findPrevious(event));
  const hasNext = loop || Boolean(navigator?.findNext(event));
  return {
    ...state,
    phase,
    current: event,
    index,
    ownedStartIsoUtc: isoUtcFromUnixMs(jumpMs),
    hasPrevious,
    hasNext,
  };
}

export function startEventPlaybackSequence<T extends EventPlaybackTimedEvent>(
  first: T | null,
  loop: boolean,
  structuralKey: string,
  navigator: EventPlaybackNavigator<T> | null = null,
): EventPlaybackStepResult<T> {
  if (!first) {
    return {
      state: { ...inactiveEventPlaybackState<T>(structuralKey), loop },
      jumpToIsoUtc: null,
      pause: false,
    };
  }
  const base: EventPlaybackSequenceState<T> = {
    ...inactiveEventPlaybackState<T>(structuralKey),
    loop,
  };
  const state = adopt(base, first, "playing", 0, navigator, first.leadInUtcMs);
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
  if (state.phase !== "paused" || !state.current) {
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
  if (state.phase === "inactive" || !state.current) {
    return { state, jumpToIsoUtc: null, pause: false };
  }
  const next: EventPlaybackSequenceState<T> = {
    ...state,
    ownedStartIsoUtc: isoUtcFromUnixMs(state.current.leadInUtcMs),
  };
  return { state: next, jumpToIsoUtc: next.ownedStartIsoUtc, pause: false };
}

export function skipEventPlaybackEvent<T extends EventPlaybackTimedEvent>(
  state: EventPlaybackSequenceState<T>,
  delta: number,
  navigator: EventPlaybackNavigator<T>,
): EventPlaybackStepResult<T> {
  if (state.phase === "inactive" || !state.current || delta === 0) {
    return { state, jumpToIsoUtc: null, pause: false };
  }
  const current = state.current;
  let target: T | null = null;
  if (delta > 0) {
    target = navigator.findNext(current);
    if (!target && state.loop) {
      target = navigator.findEarliest();
    }
  } else {
    target = navigator.findPrevious(current);
    if (!target && state.loop) {
      target = navigator.findLatest();
    }
  }
  if (!target) {
    return { state, jumpToIsoUtc: null, pause: false };
  }
  const nextIndex = state.index + (delta > 0 ? 1 : -1);
  const next = adopt(state, target, state.phase, Math.max(0, nextIndex), navigator, target.leadInUtcMs);
  return { state: next, jumpToIsoUtc: next.ownedStartIsoUtc, pause: false };
}

export function eventPlaybackCanGoPrevious<T extends EventPlaybackTimedEvent>(
  state: EventPlaybackSequenceState<T>,
): boolean {
  if (state.phase === "inactive" || !state.current) {
    return false;
  }
  return state.hasPrevious;
}

export function eventPlaybackCanGoNext<T extends EventPlaybackTimedEvent>(
  state: EventPlaybackSequenceState<T>,
): boolean {
  if (state.phase === "inactive" || !state.current) {
    return false;
  }
  return state.hasNext;
}

/**
 * Advance while playing. At most one event transition per call.
 * Forward playback never rewinds except loop final→first.
 */
export function stepEventPlaybackSequence<T extends EventPlaybackTimedEvent>(
  state: EventPlaybackSequenceState<T>,
  productUtcMs: number,
  navigator: EventPlaybackNavigator<T>,
): EventPlaybackStepResult<T> {
  if (state.phase !== "playing" || !state.current) {
    return { state, jumpToIsoUtc: null, pause: false };
  }
  const current = state.current;
  if (productUtcMs < current.transitionEndUtcMs) {
    return { state, jumpToIsoUtc: null, pause: false };
  }

  let next = navigator.findNext(current);
  while (next && next.transitionEndUtcMs <= productUtcMs) {
    next = navigator.findNext(next);
  }

  if (!next) {
    if (!state.loop) {
      return {
        state: {
          ...state,
          phase: "paused",
          ownedStartIsoUtc: isoUtcFromUnixMs(current.transitionEndUtcMs),
          hasNext: false,
        },
        jumpToIsoUtc: isoUtcFromUnixMs(current.transitionEndUtcMs),
        pause: true,
      };
    }
    const first = navigator.findEarliest();
    if (!first) {
      return {
        state: {
          ...state,
          phase: "paused",
          ownedStartIsoUtc: isoUtcFromUnixMs(current.transitionEndUtcMs),
        },
        jumpToIsoUtc: isoUtcFromUnixMs(current.transitionEndUtcMs),
        pause: true,
      };
    }
    const wrapped = adopt(state, first, "playing", 0, navigator, first.leadInUtcMs);
    return { state: wrapped, jumpToIsoUtc: isoUtcFromUnixMs(first.leadInUtcMs), pause: false };
  }

  const jumpMs = Math.max(productUtcMs, next.leadInUtcMs);
  const adopted = adopt(state, next, "playing", state.index + 1, navigator, jumpMs);
  return { state: adopted, jumpToIsoUtc: adopted.ownedStartIsoUtc, pause: false };
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
