# 0006 — Browser-first SPA with a non-load-bearing Tauri shell

- **Status:** Accepted, describing current posture. Deliberately not a commitment about the eventual platform.
- **Date:** 2026-08-14 (record written during documentation modernization)

## Context

The repository was scaffolded from a Tauri template. It still carries the evidence: `src-tauri/` with a Cargo manifest, `tauri.conf.json`, capabilities and icons; `@tauri-apps/api` and `@tauri-apps/plugin-opener` as dependencies; a `tauri` npm script; a dev server pinned to port 1420 with `strictPort` because a desktop shell expects a known port; and scaffold names (`tauri-app`) still present in `package.json` and the Tauri configuration.

Documentation described Libration as a desktop application, which created a reasonable but incorrect impression that the desktop shell was structurally required.

Direct inspection shows otherwise: **no file under `src/` imports from `@tauri-apps`.** The application persists to browser `localStorage`, acquires data with `fetch`, renders to a Canvas 2D context, and behaves identically in a plain browser and in the Tauri webview.

## Decision

Document the actual posture rather than either aspiration:

- Libration's **application architecture is browser-first**. React, TypeScript, Vite, Canvas 2D, browser `localStorage`.
- A **configured Tauri shell exists** in the repository and can be used for desktop packaging and integration.
- That shell is **not currently load-bearing**. No application behaviour depends on it.

No product decision is made here about whether the shell should become load-bearing.

## Consequences

**Good.**

- Development, inspection, and visual verification can all use a plain browser at `http://localhost:1420`, with no Rust toolchain required. This is a meaningful practical simplification.
- The architectural boundaries stay honest: capabilities that would require the shell (filesystem-backed snapshot caching, native menus, packaged distribution) are visibly absent rather than assumed.
- New contributors are not misled into looking for a desktop layer that does not exist.

**Costs.**

- Browser constraints are real and currently accepted. `localStorage` is size-limited and origin-scoped; the dynamic-data store is in-memory rather than disk-backed; large bundled assets are served rather than read locally.
- The shell is unexercised. Whatever bit-rot it accumulates will surface the first time desktop packaging is attempted.
- Scaffold naming remains visible to anyone who looks at `package.json` or the window title.

**Explicitly open.** Whether Libration eventually ships as a packaged desktop application, remains browser-first, or does both is undecided. Nothing here should be read as deprecating Tauri or as committing to the browser permanently. If the shell becomes load-bearing, this ADR should be superseded rather than edited.
