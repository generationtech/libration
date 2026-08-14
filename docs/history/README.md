# Historical documents

> **HISTORICAL — archived 2026-08-14.** Everything in this directory describes past execution, planning, or reasoning. It is **not** a source of current development state. Documents are preserved verbatim apart from a banner at the top, so they contain identifiers, status claims, and scheduling language that were accurate only when written. Current development state is owned by [`docs/STATE.md`](../STATE.md).

These files exist because the reasoning in them is valuable even though their status claims are not. When you need to know *why* something was built the way it was, and the answer is not in the code or in [`docs/decisions/`](../decisions/), it is probably here.

| Document | What it records |
|----------|-----------------|
| [`PLAN-2026-08.md`](PLAN-2026-08.md) | The pre-modernization execution plan: strategic objectives, work slices, agent session handoff, and the full closed-increment log. The richest source of design rationale for the illumination, overlay-readability, and map-catalog work. |
| [`ROADMAP-2026-08.md`](ROADMAP-2026-08.md) | The pre-modernization roadmap: the phase model (Phases 0–13), the `DLC-*` and `DLU-*` tracks, and their completion records. The authoritative record of what was built and in what order. |
| [`dynamic-data-lifecycle-execution-2026-08.md`](dynamic-data-lifecycle-execution-2026-08.md) | The original dynamic-data lifecycle plan with its `P10-*`, `DLC-*`, and `DLU-*` step tables and per-step progress log. Its still-valid contract material now lives in [`docs/specs/scene/dynamic-data-lifecycle.md`](../specs/scene/dynamic-data-lifecycle.md). |
| [`AI_COENGINEERING-2026-08.md`](AI_COENGINEERING-2026-08.md) | How the project previously divided work between an external planning model and an in-editor implementation model, with its prompt templates and stop conditions. |
| [`DEVELOPMENT_STRATEGY-2026-08.md`](DEVELOPMENT_STRATEGY-2026-08.md) | The pre-modernization engineering strategy: implementation criteria and definition of done. |

## Reading these safely

- **Status claims are stale by construction.** "Shipped", "closed", "Active step", and phase numbering describe a moment in the past.
- **Some identifiers never existed.** The archives contain `equirect-world-climate-koppen-letter-v1`, which was never in the catalog; the real id is `equirect-world-climate-koppen-beck-v1`. This is preserved deliberately. History is not silently corrected.
- **Links may point at documents that have moved or been superseded.** They are left as written.
- **Design rationale is the reason to read these.** Twilight tuning constants, the substrate capability taxonomy, dateline-roll handling, and attribution decisions are all explained here in more depth than anywhere else.

For current truth: [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md), [`ARCHITECTURE.md`](../../ARCHITECTURE.md), [`docs/decisions/`](../decisions/), [`docs/PROJECT_STRATEGY.md`](../PROJECT_STRATEGY.md).
