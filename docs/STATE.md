# Development state

Updated: 2026-08-14
Status: BLOCKED

## Active work item

[LIB-001](work/LIB-001-cursor-native-visual-verification.md) — Cursor-native visual verification (blocked)

## Last completed

Modernization M0–M3 (reconnaissance, target design, current-truth documentation, development ratchet).

## Blockers

1. Cursor built-in browser MCP (`cursor-ide-browser`) is not available in this agent session. LIB-001 implementation is in place; M4 still requires actual Cursor-browser inspection of the four canonical scenarios. See the work item **Blocker** section.

## Known failing verification

1. `src/App.configPhase2.test.ts` — false positive: glob includes `*.test.ts`; tripped by `src/renderer/dlu1VisibilityRenderReadiness.test.ts`. Production boundary intact. Remediation: modernization **M5** (do not fix earlier). Suite baseline: 1 failed / 1494 passed / 163 files.

## Awaiting human decision

Enable Cursor Browser Automation (Browser Tab), or authorize resuming LIB-001 in a session where that MCP is available. Do not authorize M5 until LIB-001 is complete.

## Next action

Resume LIB-001 visual inspection only: open the four `?scenario=` URLs plus ordinary `http://localhost:1420/` in Cursor’s built-in browser. Do not start M5. Do not expand scope.
