# Development state

Updated: 2026-08-16
Status: AWAITING SCOPE

## Active work item

None

## Last completed

[LIB-035](work/LIB-035-dynamic-live-time-integrity-and-iss-position.md) — Dynamic live-time integrity + ISS current position + display default cleanup

## Blockers

None

## Known failing verification

None

## Awaiting human decision

Approve or revise proposed [LIB-036](work/LIB-036-iss-live-provenance-freshness-and-fallback.md). Captured: hide ISS on CelesTrak failure (preferred); TLE freshness 18 h / 48 h; marker = SGP4(product UTC); acquisition must become visible without re-toggle. Remaining outside this item: USGS/GIBS fixture-on-failure; next feed after earthquake hardening.

## Next action

Stop. Proposed LIB-036 is not approved. Reply that the item is approved (and revise the 18 h / 48 h bands if needed) before implementation. Do not start earthquake hardening, GIBS `TIME`, or another live source without a new authorized item.
