# Project State

Updated: 2026-09-22
Branch: `feature/student-attendance-v2`
Latest completed work: C17 student attendance report experience (`46583f6`)

Run `node scripts/harness/context.mjs` for live branch, HEAD, and working-tree state. Do not treat this file as proof that the tree is clean.

## Attendance invariants

- `AttendanceSession.rosterSnapshot === undefined` means a pre-C10 linked session using legacy fallback behavior.
- Any array, including `[]`, means a snapshot-backed session.
- Snapshot-backed active sessions use lecturer-managed manual attendance.
- Snapshot-backed closed sessions are read-only.
- Public student self-check-in remains blocked for snapshot-backed sessions and preserved for legacy sessions.
- Manual attendance saves the complete set of present student refs. An empty set is valid.
- Starting attendance uses a lecturer-owned workbook sheet and preserves its original `sheetIndex`, including index `0`.
- New attendance sessions snapshot the selected sheet's normalized academic year. Existing sessions without a year remain readable as `Unspecified`.
- Workbook NCUK ID updates synchronize to the canonical linked Student inside a transaction. Legacy rows without `studentRef` remain workbook-only.
- The lecturer attendance-session page lists active and closed sessions independently from workbook loading. Resume and Review both use the existing session check-in route, which remains responsible for editability.
- Executive Office attendance reports may span all branches. Academic Manager attendance reports are enforced server-side to `req.user.managedBranch`; cross-branch requests are rejected.
- The attendance report page is restricted to Executive Office and Academic Manager roles. Academic Managers receive fixed branch context without an all-branches control.
- Per-student attendance aggregates use snapshot eligibility and canonical `studentRef` identity. A matching check-in is Present; an eligible roster member without one is Absent.
- Legacy sessions without roster snapshots are excluded from per-student denominators and disclosed through `excludedLegacySessionCount`.

## Completed checkpoints

- C10: immutable session roster snapshots — `bf7ae6d`
- C11: lecturer-managed manual attendance API — `c6a127f`
- C12: lecturer manual attendance UI — `a1a8299`
- C13: start attendance from workbook sheets — `0b27220`
- NCUK canonical sync — `68dd166`
- C14: lecturer attendance session history — `cbe6ed6`
- C15: branch-scoped Executive Office and Academic Manager attendance reports — `0d98c14`
- C16: academic-year student attendance reports — `5832d0c`
- C17: student attendance report experience and verified report exports — `46583f6`

## Current task

C17.5 is active in `docs/agent/NEXT.md`: unify the lecturer attendance-session and roster UI with the established Marks Management visual language while preserving attendance behavior.
