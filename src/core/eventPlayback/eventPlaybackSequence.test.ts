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

import { describe, expect, it } from "vitest";
import {
  eventPlaybackCanGoNext,
  eventPlaybackCanGoPrevious,
  eventPlaybackShouldDeactivate,
  isoUtcFromUnixMs,
  pauseEventPlaybackSequence,
  resetEventPlaybackCurrentEvent,
  resumeEventPlaybackSequence,
  skipEventPlaybackEvent,
  startEventPlaybackSequence,
  stepEventPlaybackSequence,
  stopEventPlaybackSequence,
  type EventPlaybackTimedEvent,
} from "./eventPlaybackSequence";

function ev(id: string, leadIn: number, transitionEnd: number): EventPlaybackTimedEvent & { id: string } {
  return { id, leadInUtcMs: leadIn, transitionEndUtcMs: transitionEnd, title: id, dateLabel: id };
}

describe("event playback sequencer contract", () => {
  const a = ev("a", 500, 2_500);
  const b = ev("b", 9_000, 13_000);
  const c = ev("c", 19_000, 22_000);

  it("starts at the first lead-in and does not transition on the same instant", () => {
    const started = startEventPlaybackSequence([a, b], true, "k");
    expect(started.jumpToIsoUtc).toBe(isoUtcFromUnixMs(500));
    expect(started.state.index).toBe(0);
    expect(started.state.phase).toBe("playing");
    const sameFrame = stepEventPlaybackSequence(started.state, 500);
    expect(sameFrame.jumpToIsoUtc).toBeNull();
    expect(sameFrame.state.index).toBe(0);
  });

  it("jumps to the next lead-in after post-wait and loops when enabled", () => {
    const started = startEventPlaybackSequence([a, b], true, "k");
    const toB = stepEventPlaybackSequence(started.state, 2_500);
    expect(toB.jumpToIsoUtc).toBe(isoUtcFromUnixMs(9_000));
    expect(toB.state.index).toBe(1);
    const stillB = stepEventPlaybackSequence(toB.state, 9_000);
    expect(stillB.jumpToIsoUtc).toBeNull();
    const loopToA = stepEventPlaybackSequence(toB.state, 13_000);
    expect(loopToA.state.index).toBe(0);
    expect(loopToA.jumpToIsoUtc).toBe(isoUtcFromUnixMs(500));
  });

  it("pauses at the final post-wait when loop is off", () => {
    const started = startEventPlaybackSequence([a], false, "k");
    const done = stepEventPlaybackSequence(started.state, 2_500);
    expect(done.pause).toBe(true);
    expect(done.state.phase).toBe("paused");
    expect(done.jumpToIsoUtc).toBe(isoUtcFromUnixMs(2_500));
  });

  it("previous/next wrap only when loop is on", () => {
    const started = startEventPlaybackSequence([a, b, c], false, "k");
    expect(eventPlaybackCanGoPrevious(started.state)).toBe(false);
    expect(eventPlaybackCanGoNext(started.state)).toBe(true);
    const last = skipEventPlaybackEvent(started.state, 2);
    expect(last.state.index).toBe(2);
    expect(eventPlaybackCanGoNext(last.state)).toBe(false);
    const looped = startEventPlaybackSequence([a, b], true, "k");
    const wrap = skipEventPlaybackEvent(looped.state, -1);
    expect(wrap.state.index).toBe(1);
  });

  it("reset returns to the current event lead-in", () => {
    const started = startEventPlaybackSequence([a, b], true, "k");
    const atB = skipEventPlaybackEvent(started.state, 1);
    const reset = resetEventPlaybackCurrentEvent(atB.state);
    expect(reset.jumpToIsoUtc).toBe(isoUtcFromUnixMs(9_000));
    expect(reset.state.index).toBe(1);
  });

  it("pause/resume/stop preserve the pause vs deactivate distinction", () => {
    const started = startEventPlaybackSequence([a, b], true, "k");
    const paused = pauseEventPlaybackSequence(started.state);
    expect(paused.phase).toBe("paused");
    const resumed = resumeEventPlaybackSequence(paused);
    expect(resumed.phase).toBe("playing");
    expect(resumed.index).toBe(0);
    const stopped = stopEventPlaybackSequence(resumed);
    expect(stopped.phase).toBe("inactive");
    expect(stopped.events).toEqual([]);
  });

  it("deactivates on Demo inactive, foreign start, or structural key change", () => {
    const started = startEventPlaybackSequence([a], true, "k");
    expect(
      eventPlaybackShouldDeactivate(started.state, true, started.state.ownedStartIsoUtc!, "k"),
    ).toBe(false);
    expect(eventPlaybackShouldDeactivate(started.state, false, started.state.ownedStartIsoUtc!, "k")).toBe(
      true,
    );
    expect(eventPlaybackShouldDeactivate(started.state, true, "2030-01-01T00:00:00.000Z", "k")).toBe(true);
    expect(eventPlaybackShouldDeactivate(started.state, true, started.state.ownedStartIsoUtc!, "other")).toBe(
      true,
    );
  });
});
