# Libration

## Overview

Libration is a canonical reference implementation of a longitude-first world time visualization system.

![Libration application screenshot](docs/images/libration-hero.png)

It uses:
- a longitude-first time model
- 24 fixed structural sectors (15° each)
- UTC as canonical time
- display-time derived via reference-time logic
- a renderer-agnostic rendering pipeline

It is a high-fidelity world time instrument built on a **render-plan architecture** and currently delivered as a local-first desktop application.

```mermaid
flowchart LR
    R[Resolver] --> S[Semantic Planning]
    S --> L[Layout]
    L --> RP[RenderPlan]
    RP --> E[Executor]
    E --> B[Backend]

    %% Styling
    classDef upstream fill:#1f2933,stroke:#6b8fb3,color:#e6edf3;
    classDef boundary fill:#0b1f2a,stroke:#00bcd4,stroke-width:3px,color:#e6edf3;
    classDef downstream fill:#1f2933,stroke:#4b5563,color:#cbd5e1;

    class R,S,L upstream;
    class RP boundary;
    class E,B downstream;
```

Libration resolves rendering intent upstream and emits a backend-agnostic RenderPlan for execution.

---

## Project Philosophy

Libration is intended to be a canonical, publicly accessible, user-freedom-preserving reference implementation of this system.

This project prioritizes the freedom of users to:
- 🔍 Inspect the software
- 🧠 Study how it works
- 🛠 Modify it
- 🔄 Share it
- 📈 Benefit from improvements made by others

To preserve those freedoms downstream, Libration is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

Libration is independently developed and is not affiliated with any existing commercial product.

---

## Current UI Direction

Top band consists of:
- Hour markers
- Tickmark tape (hour / 15 / 5)
- NATO timezone strip (continuous rectangular band)

```mermaid
flowchart TB
    IE[Indicator Entries]
    TT[Tickmark Tape]
    NZ[NATO Timezone Strip]

    SCENE[Scene Viewport]

    IE --> TT
    TT --> NZ
    NZ --> SCENE

    %% Styling
    classDef chrome fill:#16212b,stroke:#8aa4c8,color:#e6edf3;
    classDef scene fill:#0b1220,stroke:#4b5563,color:#cbd5e1;
    classDef boundary fill:#00000000,stroke:#00bcd4,stroke-width:2px,color:#00bcd4;

    class IE,TT,NZ chrome;
    class SCENE scene;

    %% Conceptual boundary (chrome vs scene)
    BOUNDARY[Reserved Layout Boundary]
    NZ -.-> BOUNDARY
    BOUNDARY -.-> SCENE

    class BOUNDARY boundary;
```

Top chrome is composed in screen space and **reserves vertical layout**.  
The scene viewport begins strictly below the visible chrome stack.

The top instrument strip uses one built-in appearance for now; future tweaks will be direct config controls, not bundled palette presets.

Top chrome is now treated as real application layout:
- the top chrome stack reserves vertical space above the map
- the scene viewport begins below the visible top chrome
- hiding top-band areas reclaims that space instead of leaving map content hidden underneath chrome

Chrome editing is now organized by major area rather than one long mixed panel. Current major areas include:
- 24-hour indicator entries
- 24-hour tickmarks tape
- NATO timezone area

Each top-band area now has independent persisted visibility where applicable, including:
- `chrome.layout.hourMarkers.indicatorEntriesAreaVisible`
- `chrome.layout.tickTapeVisible`
- `chrome.layout.timezoneLetterRowVisible`

Recent simplification:
- top-band alignment and timing behavior are unchanged
- the present-time tick mark lives in the 24-hour tickmark tape only; it is no longer double-drawn into the upper indicator entries area

![Accelerated map demo](docs/images/libration-map-demo.gif)
---

## Hour Marker Direction

Top-band hour markers now use a clean, explicit model:

- **Behavior** — how markers move or stay anchored
- **Realization** — text or procedural glyph mode
- **Layout** — size and placement semantics
- **Appearance** — realization-scoped styling layered on top

```mermaid
flowchart TB
    HM[Resolved Hour Marker Model]

    B[Behavior]
    R[Realization]
    L[Layout]
    A[Appearance]

    B --- HM
    R --- HM
    L --- HM
    A --- HM

    %% Styling
    classDef center fill:#0b1f2a,stroke:#00bcd4,stroke-width:3px,color:#e6edf3;
    classDef axis fill:#16212b,stroke:#8aa4c8,color:#e6edf3;

    class HM center;
    class B,R,L,A axis;
```

At semantic runtime, hour-marker **content** is still derived as part of the resolved plan (for example `hour24` vs `localWallClock`), but it is no longer treated as a persisted editor-owned axis.

Implemented realizations:
- **Text**
  - bundled font asset selection
  - size and styling overrides layered on top
- **Procedural glyphs**
  - analog clock markers
  - radial wedge
  - radial line

Bundled font inventory currently includes:
- Zeroes One
- Zeroes Two
- DSEG7Modern-Regular
- DotMatrix-Regular
- COMPUTER
- Flip Clock
- Kremlin

Hour markers now persist through a single structured config surface:

`chrome.layout.hourMarkers`

That model is authoritative for:
- editor authoring
- normalization
- runtime resolution
- persistence

### Indicator-band vertical model

```mermaid
flowchart TB
    TP[Top Padding]
    CT[Content<br/>Intrinsic Height]
    BP[Bottom Padding]

    TOTAL[Total Indicator Band Height]

    TP --> CT
    CT --> BP
    BP --> TOTAL

    %% Styling
    classDef padding fill:#16212b,stroke:#8aa4c8,color:#e6edf3;
    classDef content fill:#0b1f2a,stroke:#00bcd4,stroke-width:3px,color:#e6edf3;
    classDef total fill:#0b1220,stroke:#4b5563,color:#cbd5e1;

    class TP,BP padding;
    class CT content;
    class TOTAL total;
```

**Total Height = intrinsic content height + top padding + bottom padding**

Padding affects spacing only. It does not change intrinsic text size, glyph size, or fitted marker geometry.

Where:
- intrinsic content height comes from text intrinsic sizing in text mode
- intrinsic content height comes from fitted geometry in glyph modes
- `contentPaddingTopPx` / `contentPaddingBottomPx` affect spacing only
- padding must never affect text size, glyph size, radius, or emitted marker scale
- Auto padding is intrinsic-based, not fixed-band/slack-based

The config popup exposes:
- **Content row padding (top)**
- **Content row padding (bottom)**

Empty values use Auto; numeric values are exact px overrides.

---

## Data Mode Default

On a fresh deploy or first application load, the default data mode is:

`static`

That default is defined at the canonical config layer and is only used when no persisted user configuration exists. Existing saved user state continues to take precedence.

The current data model is intentionally local-first:
- no live network feeds
- no background refresh

---

## Font / Typography Status

```mermaid
flowchart TB
    FA[fontAssetId]
    FR[FontAssetRegistry]
    RS[ResolveTextStyle]
    RP[RenderPlan Text]
    CB[Canvas Text Bridge]
    CR[Canvas Native Text Rendering]
    FG[Future Glyph Atlas or Outline Renderer]

    FA --> FR
    FR --> RS
    RS --> RP
    RP --> CB
    CB --> CR

    RP -. future .-> FG

    %% Styling
    classDef pipeline fill:#16212b,stroke:#8aa4c8,color:#e6edf3;
    classDef boundary fill:#0b1f2a,stroke:#00bcd4,stroke-width:3px,color:#e6edf3;
    classDef backend fill:#0b1220,stroke:#4b5563,color:#cbd5e1;
    classDef future fill:#111827,stroke:#7c8aa0,color:#cbd5e1,stroke-dasharray: 5 5;

    class FA,FR,RS pipeline;
    class RP boundary;
    class CB,CR backend;
    class FG future;
```

Bundled font assets resolve into backend-agnostic text intent first.  
Today, the active Canvas backend realizes that text through its Canvas text bridge and native Canvas text rendering path.

A future glyph-atlas or outline-based text renderer would attach downstream of the same RenderPlan boundary.

The project has:
- a preprocessed font asset manifest
- runtime font asset lookup by stable ID
- semantic typography roles
- glyph/text emission through `RenderPlan`

Current Canvas rendering still uses **native Canvas text realization** at the backend edge, but bundled fonts are loaded and registered at runtime so changing `fontAssetId` visibly changes output in the active Canvas backend.

So today the live text path is:

`fontAssetId -> FontAssetRegistry -> resolveTextStyle -> RenderPlan text -> Canvas text bridge -> Canvas native text rendering`

The project does **not yet** use a custom glyph-outline or atlas-based text renderer.

---

## Architecture

```mermaid
flowchart LR
    subgraph UPSTREAM[Upstream Intent Resolution]
        direction LR

        subgraph SCENE[Scene Pipeline]
            SR[Resolver] --> SS[Semantic Planning]
            SS --> SL[Layout]
            SL --> SA[Adapter]
        end

        subgraph CHROME[Chrome Pipeline]
            CR[Resolver] --> CS[Semantic Planning]
            CS --> CL[Layout]
            CL --> CA[Adapter]
        end
    end

    SA --> RP[RenderPlan]
    CA --> RP

    RP --> EX[Executor]
    EX --> BE[Backend]

    NS[Backend executes only: no product semantics]

    RP -. hard boundary .- NS

    %% Styling
    classDef pipeline fill:#16212b,stroke:#8aa4c8,color:#e6edf3;
    classDef boundary fill:#0b1f2a,stroke:#00bcd4,stroke-width:3px,color:#e6edf3;
    classDef backend fill:#0b1220,stroke:#4b5563,color:#cbd5e1;
    classDef note fill:#111827,stroke:#7c8aa0,color:#cbd5e1,stroke-dasharray: 5 5;
    classDef group fill:#0f1720,stroke:#3b4b5c,color:#e6edf3;

    class SR,SS,SL,SA,CR,CS,CL,CA pipeline;
    class RP boundary;
    class EX,BE backend;
    class NS note;
    class SCENE,CHROME,UPSTREAM group;
```

Libration resolves scene and chrome intent upstream, converts both into a shared **RenderPlan**, and only then hands execution to the backend.

The backend executes drawing instructions only. It does not derive product semantics, layout policy, or chrome reservation rules.

`Resolver / Planner / Layout / Adapter → RenderPlan → Executor`

All rendering intent is resolved before backend execution.

```mermaid
flowchart TB
    TC[Top Chrome Reserved Layout]
    SV[Scene Viewport Computed Upstream]
    SD[sceneLayerViewportPx]
    BE[Backend Execution]

    TC --> SV
    SV --> SD
    SD --> BE

    NOTE[Backend does not derive viewport layout]

    SD -. concrete layout data .-> NOTE

    %% Styling
    classDef chrome fill:#16212b,stroke:#8aa4c8,color:#e6edf3;
    classDef boundary fill:#0b1f2a,stroke:#00bcd4,stroke-width:3px,color:#e6edf3;
    classDef backend fill:#0b1220,stroke:#4b5563,color:#cbd5e1;
    classDef note fill:#111827,stroke:#7c8aa0,color:#cbd5e1,stroke-dasharray: 5 5;

    class TC chrome;
    class SV,SD boundary;
    class BE backend;
    class NOTE note;
```

The scene viewport for visible map content is also resolved upstream and passed to the backend as concrete layout data (`sceneLayerViewportPx`), so backends do not derive top-chrome reservation rules themselves.

Current backend:
- Canvas

Planned future backend:
- native / NVIDIA RTX-class renderer

---

## Status

Initial public release: **v1.0.0**  
Architecture stable.  
Top-band hour-marker runtime migration complete for the supported production path.  
Hour-marker editor and persistence migration complete.  
Typography + glyph subsystem implemented.  
Canvas bundled-font realization working.  
Current engineering focus: feature-forward top-band chrome work on top of the completed structured hour-marker model.

---

## Saved Configuration — Hour Markers (Breaking Change)

Hour-marker persistence now requires:

`chrome.layout.hourMarkers`

Older saved configs that only used legacy flat hour-marker fields are no longer compatible. This was an intentional full cutover.

---

## Run

```bash
npm install
npm run tauri dev
```

---

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

The AGPL is used so that users retain access to the source code and improvements made to the software, including in network-hosted deployments.
