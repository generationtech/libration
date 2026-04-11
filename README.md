# libration

## Overview

libration is a high-fidelity world time instrument built on a **render-plan architecture**.

### Saved configuration — hour markers (breaking change)

Top-band hour marker settings are persisted **only** under `chrome.layout.hourMarkers` (structured). Saved configs that relied on removed flat hour-marker fields on `chrome.layout` are **not** compatible. This was an intentional full cutover to the structured model.

---

## Key Architecture

Rendering uses:

RenderPlan → Executor

This ensures:
- renderer independence
- deterministic output
- future GPU compatibility

---

## Features

- solar illumination
- subsolar / sublunar markers
- city pins with labels
- floating time overlays
- high-fidelity chrome system

---

## Rendering Model

All visuals are expressed as:
- primitives
- gradients
- raster patches
- image blits

Backend only executes.

---

## Status

Architecture is stable.
Development now focuses on features.

---

## Run

npm install  
npm run tauri dev
