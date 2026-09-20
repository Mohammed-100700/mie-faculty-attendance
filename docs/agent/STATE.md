# Project State

Updated: 2026-09-21
Branch: `feature/student-attendance-v2`
Latest completed work: C14 lecturer attendance session history (`cbe6ed6`)

Run `node scripts/harness/context.mjs` for live branch, HEAD, and working-tree state. Do not treat this file as proof that the tree is clean.

## Attendance invariants

- `AttendanceSession.rosterSnapshot === undefined` means a pre-C10 linked session using legacy fallback behavior.
- Any array, including `[]`, means a snapshot-backed session.
- Snapshot-backed active sessions use lecturer-managed manual attendance.
- Snapshot-backed closed sessions are read-only.
- Public student self-check-in remains blocked for snapshot-backed sessions and preserved for legacy sessions.
- Manual attendance saves the complete set of present student refs. An empty set is valid.
- Starting attendance uses a lecturer-owned workbook sheet and preserves its original `sheetIndex`, including index `0`.
- Workbook NCUK ID updates synchronize to the canonical linked Student inside a transaction. Legacy rows without `studentRef` remain workbook-only.
- The lecturer attendance-session page lists active and closed sessions independently from workbook loading. Resume and Review both use the existing session check-in route, which remains responsible for editability.

## Completed checkpoints

- C10: immutable session roster snapshots — `bf7ae6d`
- C11: lecturer-managed manual attendance API — `c6a127f`
- C12: lecturer manual attendance UI — `a1a8299`
- C13: start attendance from workbook sheets — `0b27220`
- NCUK canonical sync — `68dd166`
- C14: lecturer attendance session history — `cbe6ed6`

## Current task

No product checkpoint is active. `docs/agent/NEXT.md` is `EMPTY`. Plan the next checkpoint before modifying application code.
