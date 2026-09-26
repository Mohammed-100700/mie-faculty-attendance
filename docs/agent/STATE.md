# Project State

Updated: 2026-09-27
Branch: `feature/student-attendance-v2`
Latest completed work: C19 auditable attendance session cancellation (`a4a0f72`, `b5eb2d0`)

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
- The lecturer attendance workspace lists Active, Closed, and Cancelled sessions independently from workbook loading. Resume and Review use the existing session check-in route.
- Executive Office attendance reports may span all branches. Academic Manager attendance reports are enforced server-side to `req.user.managedBranch`; cross-branch requests are rejected.
- The attendance report page is restricted to Executive Office and Academic Manager roles. Academic Managers receive fixed branch context without an all-branches control.
- Per-student attendance aggregates use snapshot eligibility and canonical `studentRef` identity. A matching check-in is Present; an eligible roster member without one is Absent.
- Legacy sessions without roster snapshots are excluded from per-student denominators and disclosed through `excludedLegacySessionCount`.
- Session cancellation is auditable and non-destructive. The session, immutable roster snapshot, and all check-ins are preserved.
- Cancellation uses an atomic `cancelledAt: null` guard, records the original reason, actor, and timestamp once, and makes the session read-only.
- Active, closed, snapshot-backed, pre-C10, and legacy sessions may be cancelled by their owning lecturer. Cancelled sessions cannot be closed, edited, or checked into.
- Management session reports retain cancelled sessions for audit. Student attendance denominators, histories, totals, and exports exclude them and disclose `excludedCancelledSessionCount`.
- The public session-code response exposes only `isCancelled`; cancellation reasons and actors remain protected.

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
- C17.5: unified lecturer attendance workspace — `a8ea5ab`
- C18: marks-style management attendance review and class/student PDF exports — `f263a79`
- C19A: auditable attendance session cancellation backend — `a4a0f72`
- C19B: lecturer and management cancellation UI — `b5eb2d0`

## Current task

No product checkpoint is active. `docs/agent/NEXT.md` is `EMPTY`. Plan the next checkpoint before modifying application code.
