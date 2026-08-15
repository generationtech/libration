# LIB-013 — Eclipse authority evaluation and selection

| Field | Value |
|-------|-------|
| ID | LIB-013 |
| Status | complete |
| Created | 2026-08-15 |
| Approved | 2026-08-15 (human) |
| Completed | 2026-08-15 |

Human-authorized research / architecture-decision item. Authorized to create, approve, activate, execute, and complete in the same request. Do not implement production eclipse behaviour.

## Objective

Select the source/model that will authoritatively provide eclipse existence, type, contacts, central-event timing, shadow geometry, geographic path/boundaries where applicable, and offline forecasting across a documented span — strongly enough that a later E1 implementation can consume a stable authority boundary.

## Scope

**In scope**

- Evaluate candidate authority classes (precomputed catalog, Besselian/element-driven local computation, high-precision ephemeris, hybrid catalog + local geometry).
- Treat solar and lunar authorities as independently choosable behind one consumer-facing boundary.
- Define a practical precision target, bundled offline span, outside-span behaviour, data-volume estimates, licensing/provenance, versioning, discovery, and time-parameterized geometry.
- Record research provenance; recommend a concrete authority strategy; define a conceptual authority contract.
- Update the Eclipse System spec with the selected authority.

**Out of scope**

- Production eclipse source, data assets, generation scripts, dependencies, layers, config, UI, RenderPlan payloads, visual scenarios.
- Changing Sun/Moon models.
- Creating, approving, or activating E1 or any implementation LIB.
- Commits, pushes, tags, branches, or releases.

## Architectural boundaries

- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — product semantics upstream of `RenderPlan`; one UTC instant; no network in the render path; catalog-driven assets.
- [ADR 0003](../decisions/0003-bundled-base-map-catalog-with-durable-family-ids.md), [ADR 0004](../decisions/0004-one-canonical-utc-instant-per-frame.md), [ADR 0005](../decisions/0005-dynamic-data-acquisition-outside-the-render-path.md).
- Intended structure: [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md).
- Product intent: [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md#eclipse-system).
- Predecessor: [`docs/work/LIB-012-eclipse-system-architecture.md`](LIB-012-eclipse-system-architecture.md).

## Acceptance criteria

- Four authority classes evaluated against solar and lunar needs, with authoritative citations.
- Concrete recommendation (not an open tradeoff list) covering source, span, precision, size, licensing, local math, and what is not used.
- Conceptual `EclipseAuthority` contract sufficient for E1 to begin without another research phase, or one remaining blocker named.
- Eclipse System spec updated; no production code/tests/config/dependencies changed; no E1 LIB created.
- STATE returns to **AWAITING SCOPE**.

## Verification plan

- Focused tests: none (documentation/research only)
- Full suite: yes (`npm test`) — baseline confirmation that this item did not change product code
- Type-check: yes (`npx tsc --noEmit`)
- Build: no — documentation-only
- Visual verification: no — rendered output must not change

## Documentation impact

- This work item.
- [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md) — selected authority, provenance, precision, span, contract.
- [`docs/STATE.md`](../STATE.md)
- [`docs/ROADMAP.md`](../ROADMAP.md) and [`docs/FUTURE_FEATURES.md`](../FUTURE_FEATURES.md) — authority is selected; implementation still unapproved.
- [`docs/IMPLEMENTATION.md`](../IMPLEMENTATION.md) — read-next pointer only.
- [`docs/DEVELOPMENT_LOG.md`](../DEVELOPMENT_LOG.md)
- No ADR: this repo’s ADRs record durable choices evidenced in source. Authority is owned by the Eclipse System spec until E1 lands; `EclipseEventService` ADR remains deferred to implementation.

## Research provenance

Primary sources consulted (2026-08-15):

| Source | URL / identifier | Used for |
|--------|------------------|----------|
| NASA/TP-2006-214141 Five Millennium Canon of Solar Eclipses | https://eclipse.gsfc.nasa.gov/SEpubs/5MCSE.html | Solar maps, ephemeris, ΔT, k, counts |
| NASA/TP-2009-214174 Five Millennium Catalog of Solar Eclipses | https://eclipse.gsfc.nasa.gov/SEpubs/5MKSE.html | Solar event metadata; ASCII ~1.3 MB |
| Solar catalog index + century tables | https://eclipse.gsfc.nasa.gov/SEcat5/SEcatalog.html | 228 (1901–2000) + 224 (2001–2100) solar events |
| Solar catalog key | https://eclipse.gsfc.nasa.gov/SEcat5/SEcatkey.html | Fields; VSOP87/ELP-2000/82; Meeus elements |
| Besselian method page | https://eclipse.gsfc.nasa.gov/SEcat5/beselm.html | Element definitions; Chauvenet; Explanatory Supplement 1974; Meeus 1989 |
| Besselian CSV listing | same catalog index, dated 2014 Apr 11 | `eclipse_besselian_from_mysqldump2.csv` |
| 2024 Apr 08 Besselian page | https://eclipse.gsfc.nasa.gov/SEbeselm/SEbeselm2001/SE2024Apr08Tbeselm.html | Polynomials; GE 18:17:18.3 UT, 25°17.2′N 104°08.3′W, ΔT=70.6 s, ELP2000-85 |
| 2024 Apr 08 path table | https://eclipse.gsfc.nasa.gov/SEpath/SEpath2001/SE2024Apr08Tpath.html | WGS 84 path samples; GE/GD |
| 2024 search/data page | https://eclipse.gsfc.nasa.gov/SEsearch/SEdata.php?Ecl=20240408 | Canon dump ΔT=74 s, same γ/magnitude |
| NASA eclipse copyright | https://eclipse.gsfc.nasa.gov/SEpubs/copyright.html | Reproduction + required credit |
| NASA/TP-2009-214172 lunar canon | https://eclipse.gsfc.nasa.gov/SEpubs/5MCLE.html | Lunar maps; Danjon enlargement |
| NASA/TP-2009-214173 lunar catalog | https://eclipse.gsfc.nasa.gov/SEpubs/5MKLE.html | Lunar metadata; ASCII ~1.3 MB |
| Lunar catalog key | https://eclipse.gsfc.nasa.gov/LEcat5/LEcatkey.html | Contacts via durations; zenith lat/lon |
| VSOP87/ELP prediction note | https://eclipse.gsfc.nasa.gov/SEpath/ve82-predictions.html | Truncation error ≪ ΔT and limb |
| NASA eclipse prediction explanation | https://eclipse.gsfc.nasa.gov/SEmono/reference/explain.html | Polynomial validity t0±3 h |
| JPL DE440/DE441 | Park et al. 2021, AJ 161:105; https://ssd.jpl.nasa.gov/planets/eph_export.html | Span, precision; DE440s ~31 MB, DE440 ~114 MB, DE441 ~3 GB |
| NAIF rules | https://naif.jpl.nasa.gov/naif/rules.html | Unmodified kernel redistribution allowed |
| USNO Solar Eclipse Computer | https://aa.usno.navy.mil/data/SolarEclipses | 2017–2026 local circumstances only; Circulars discontinued 1991 |
| USNO eclipse references | https://aa.usno.navy.mil/faq/eclipse_ref | Almanac + Explanatory Supplement ch. 11; not a bundleable millennial catalog |
| Bretagnon & Francou 1988 | *Astron. Astrophys.* 202, 309 | VSOP87 |
| Chapront-Touzé & Chapront 1983 | *Astron. Astrophys.* 124, 50 | ELP-2000/82 |
| Morrison & Stephenson 2004 | *J. Hist. Astron.* 35, 327 | Historical ΔT |
| Chauvenet 1891 | *Manual of Spherical and Practical Astronomy* vol. 1 | Public-domain Besselian algorithm |

Community re-encodings (schema inspection only, **not** the import source): GitHub `gmiller123456/FiveMillenniumCanonOfSolarEclipses-Besselian-Elements` (CSV header: `year,mon,day,jd,t0,deltaT,x1…x4,y1…y4,d1…d3,m1…m3,l11…l13,l21…l23,tanf1,tanf2`).

Glyph-offset computation: production series transcribed from `src/core/subsolarPoint.ts` and `src/core/sublunarPoint.ts` (not modified) vs NASA 2024 RA/Dec and lunar zenith points. Sun ~0.006° (~0.7 km); Moon ~0.03°–0.42° (~4–46 km); 2024 TSE Moon ~0.20° (~23 km). Sublunar vs umbral GE ~20° is shadow geometry (Sun altitude ~70°), not model error.

## Selection

Recorded in [`docs/specs/scene/eclipse-system.md`](../specs/scene/eclipse-system.md) §22.

- **Solar:** bundled NASA/Espenak–Meeus Besselian polynomials + local standard geometry.
- **Lunar:** bundled NASA/Espenak–Meeus catalog (contacts/magnitudes/gamma/zenith) + local circular-shadow geometry.
- **Common:** one versioned offline `EclipseAuthority`.
- **Span:** 1900-01-01T00:00:00.000Z ≤ T < 2101-01-01T00:00:00.000Z.
- **Outside span:** explicit unsupported; no ambient fallback.
- **E1 ready:** yes.

## Completion record

**Implementation summary**

Evaluated four authority classes against NASA GSFC, JPL, and USNO primary sources. Selected hybrid option D with a concrete NASA/Espenak–Meeus bundled authority: solar Besselian polynomials plus local Chauvenet/Explanatory Supplement geometry; lunar catalog events plus local Danjon-shadow geometry; one `EclipseAuthority` contract; 1900–2100 offline span; explicit outside-range state. Recorded in the Eclipse System spec §22. No production code, tests, config, dependencies, or data assets. No E1 LIB created. No ADR (decision lives in the spec until implementation).

**Commands run**

- Primary-source fetches of NASA GSFC eclipse publications, catalog keys, Besselian pages, copyright, JPL/NAIF, USNO
- Research computation of current `subsolarPoint` / `sublunarPoint` vs NASA positions (models not edited)
- `npx tsc --noEmit`
- `npm test`

**Actual results**

- `npx tsc --noEmit`: clean (exit 0)
- `npm test`: 174 files / 1631 passed / 0 failed
- `git status`: documentation only (`docs/FUTURE_FEATURES.md`, `docs/IMPLEMENTATION.md`, `docs/ROADMAP.md`, `docs/STATE.md`, `docs/specs/scene/eclipse-system.md`, `docs/work/LIB-013-eclipse-authority-evaluation.md`, `docs/DEVELOPMENT_LOG.md`). No `src/`, tests, config, or dependency changes.
- No `docs/work/LIB-014*` or E1 work item created.


**Visual verification**

Not applicable — rendered output must not change.

**Not verified**

- Byte-for-byte download of `eclipse_besselian_from_mysqldump2.csv` from GSFC (URL listed; HTTP fetch from this environment returned empty; schema confirmed from NASA pages + independent re-encoding). E1 must retrieve from NASA GSFC.
- Lunar contact asymmetry vs duration-symmetry (expected ≪ 1 min; not measured event-by-event).
- Independent JPL-vs-Canon kilometre comparison beyond published NASA statements that ΔT and lunar limb dominate error.

**Discovered, not done**

- E1–E6 remain proposed slices in the spec, not work items.
- Authority ingest script and derived asset are E1’s to create.
- Optional later ΔT refresh and optional eclipse-time glyph snap remain product choices, not started.
