# 0004 — One canonical UTC instant per frame

- **Status:** Accepted
- **Date:** 2026-08-14 (record written during documentation modernization; the decision is visible in the frame loop in `src/App.tsx` and in `TimeContext`)

## Context

A frame of Libration consumes time in many places at once: the subsolar and sublunar points, the illumination field, the phased civil hour tape, the structural column labels, the bottom readout, city pin local times, the month-aware base-map raster, the analemma track, and dynamic-data snapshot selection.

Each of those could independently ask the system clock. In most applications that would be harmless. Here it is not: the whole point of the instrument is that these elements agree.

## Decision

Each frame resolves **exactly one** canonical product UTC instant, at the top of the frame, and threads it through a `TimeContext` to everything downstream. No code downstream of that point consults a wall clock.

Demo time is the single sanctioned alternative source. It **substitutes** the instant rather than adding a parallel clock, and is otherwise indistinguishable downstream apart from an explicit `simulated` flag.

Display modes, reference zones, and reference cities format or project the instant. They never mutate it.

## Consequences

**Good.**

- Every frame is internally coherent by construction. The terminator, the tape, the pins, and the readout cannot disagree, because there is nothing for them to disagree about.
- Time-travel works uniformly. Because everything derives from one value, changing it moves the entire scene consistently, including which dynamic snapshot is selected and which month raster resolves.
- Rendering is a pure function of resolved state, which is what makes plan-level testing meaningful.

**Costs.**

- Time must be threaded explicitly rather than read ambiently. Every layer, planner, and resolver takes it as input.
- The rule is easy to break accidentally and hard to notice when broken: a stray `Date.now()` produces a sub-millisecond discrepancy that is invisible in normal operation and produces obviously wrong output only during demo playback or accelerated time.
- Frame-delta handling needs explicit care at mode transitions. Switching demo mode on or off resets the delta baseline so the change cannot inject a spurious jump.

**Rationale for the demo exception.** Deterministic and accelerated time is genuinely necessary for demonstration and for reviewing seasonal and diurnal behaviour. Providing it by substitution rather than addition is what keeps the invariant intact.
