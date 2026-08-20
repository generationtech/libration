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
import type { EclipseTourScheduledEvent } from "./eclipseTourCatalog";
import {
  eclipseTourCanGoNext,
  eclipseTourCanGoPrevious,
  isoUtcFromUnixMs,
  pauseEclipseTourSequence,
  resetEclipseTourCurrentEvent,
  resumeEclipseTourSequence,
  skipEclipseTourEvent,
  startEclipseTourSequence,
  stepEclipseTourSequence,
  stopEclipseTourSequence,
} from "./eclipseTourSequence";

function ev(
  id: string,
  kind: "solar" | "lunar",
  start: number,
  end: number,
  leadIn: number,
  transitionEnd: number,
): EclipseTourScheduledEvent {
  return {
    eventId: id,
    kind,
    subtype: "total",
    title: kind === "solar" ? "Total solar eclipse" : "Total lunar eclipse",
    dateLabel: "Jan 1 2000",
    sortTimeUtcMs: start + (end - start) / 2,
    eventStartUtcMs: start,
    greatestUtcMs: start + (end - start) / 2,
    eventEndUtcMs: end,
    leadInUtcMs: leadIn,
    transitionEndUtcMs: transitionEnd,
  };
}

describe("eclipse tour sequencer", () => {
  const a = ev("a", "solar", 1_000, 2_000, 500, 2_500);
  const b = ev("b", "lunar", 10_000, 12_000, 9_000, 13_000);
  const c = ev("c", "solar", 20_000, 21_000, 19_000, 22_000);

  it("starts at the first lead-in and does not transition on the same instant", () => {
    const started = startEclipseTourSequence([a, b], true, "k");
    expect(started.jumpToIsoUtc).toBe(isoUtcFromUnixMs(500));
    expect(started.state.current?.eventId).toBe("a");
    expect(started.state.phase).toBe("playing");
    const sameFrame = stepEclipseTourSequence(started.state, 500);
    expect(sameFrame.jumpToIsoUtc).toBeNull();
    expect(sameFrame.state.current?.eventId).toBe("a");
  });

  it("jumps to the next lead-in after post-wait and loops when enabled", () => {
    const started = startEclipseTourSequence([a, b], true, "k");
    const toB = stepEclipseTourSequence(started.state, 2_500);
    expect(toB.jumpToIsoUtc).toBe(isoUtcFromUnixMs(9_000));
    expect(toB.state.current?.eventId).toBe("b");
    const stillB = stepEclipseTourSequence(toB.state, 9_000);
    expect(stillB.jumpToIsoUtc).toBeNull();
    const loopToA = stepEclipseTourSequence(toB.state, 13_000);
    expect(loopToA.state.current?.eventId).toBe("a");
    expect(loopToA.jumpToIsoUtc).toBe(isoUtcFromUnixMs(500));
  });

  it("pauses at the final post-wait when loop is off", () => {
    const started = startEclipseTourSequence([a], false, "k");
    const done = stepEclipseTourSequence(started.state, 2_500);
    expect(done.pause).toBe(true);
    expect(done.state.phase).toBe("paused");
    expect(done.state.current?.eventId).toBe("a");
    expect(done.jumpToIsoUtc).toBe(isoUtcFromUnixMs(2_500));
    const again = stepEclipseTourSequence(done.state, 2_501);
    expect(again.jumpToIsoUtc).toBeNull();
  });

  it("single-event loop returns to the same lead-in", () => {
    const started = startEclipseTourSequence([a], true, "k");
    const again = stepEclipseTourSequence(started.state, 2_500);
    expect(again.state.current?.eventId).toBe("a");
    expect(again.jumpToIsoUtc).toBe(isoUtcFromUnixMs(500));
    expect(again.state.phase).toBe("playing");
  });

  it("pause/resume preserve index; reset returns current lead-in", () => {
    const started = startEclipseTourSequence([a, b], true, "k");
    const toB = stepEclipseTourSequence(started.state, 2_500);
    const paused = pauseEclipseTourSequence(toB.state);
    expect(paused.phase).toBe("paused");
    expect(paused.current?.eventId).toBe("b");
    const resumed = resumeEclipseTourSequence(paused);
    expect(resumed.phase).toBe("playing");
    expect(resumed.current?.eventId).toBe("b");
    const reset = resetEclipseTourCurrentEvent(resumed);
    expect(reset.jumpToIsoUtc).toBe(isoUtcFromUnixMs(9_000));
    expect(reset.state.current?.eventId).toBe("b");
  });

  it("next/previous wrap only when looping; stop deactivates", () => {
    const started = startEclipseTourSequence([a, b, c], false, "k");
    expect(eclipseTourCanGoPrevious(started.state)).toBe(false);
    expect(eclipseTourCanGoNext(started.state)).toBe(true);
    const next = skipEclipseTourEvent(started.state, 1);
    expect(next.state.current?.eventId).toBe("b");
    const last = skipEclipseTourEvent(next.state, 1);
    expect(last.state.current?.eventId).toBe("c");
    expect(eclipseTourCanGoNext(last.state)).toBe(false);
    const noWrap = skipEclipseTourEvent(last.state, 1);
    expect(noWrap.jumpToIsoUtc).toBeNull();
    const looping = startEclipseTourSequence([a, b], true, "k");
    const wrapPrev = skipEclipseTourEvent(looping.state, -1);
    expect(wrapPrev.state.current?.eventId).toBe("b");
    const stopped = stopEclipseTourSequence(looping.state);
    expect(stopped.phase).toBe("inactive");
    expect(stopped.ownedStartIsoUtc).toBeNull();
  });

  it("does not rewind when the next lead-in is already in the past", () => {
    const closeB = ev("b2", "lunar", 2_400, 3_000, 2_200, 3_200);
    const started = startEclipseTourSequence([a, closeB], false, "k");
    const step = stepEclipseTourSequence(started.state, 2_500);
    expect(step.state.current?.eventId).toBe("b2");
    expect(step.jumpToIsoUtc).toBe(isoUtcFromUnixMs(2_500));
  });

  it("empty sequence stays inert", () => {
    const started = startEclipseTourSequence([], true, "k");
    expect(started.state.phase).toBe("inactive");
    expect(started.jumpToIsoUtc).toBeNull();
  });
});
