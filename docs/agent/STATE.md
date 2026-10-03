# Project State

Updated: 2026-10-03
Branch: `feature/student-attendance-v2`
Latest completed work: C20H administrator user and assignment integrity (`85a8534`)

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
- Every workbook mutation parses its sheet, test, student, and column indexes through one canonical non-negative integer parser and validates the target record before mutating. Malformed indexes are controlled 400s and never delete or change another record.
- Every workbook mutation of an existing sheet requires the lecturer's current, active branch and subject assignment. `getWorkbook` and `getAllWorkbooks` are unchanged, so historical sheets stay readable.
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
- Workbook assignment values are administrator-owned. Lecturers cannot edit their own branch or subject assignments, and academic records are authorized against the database rather than a client value.
- Workbook mutation is validated positionally and authorized against current assignments. A malformed index is a controlled 400; an unassigned or inactive sheet is a controlled 403; missing records are controlled 404s.
- Class-log creation and update store an accepted calendar day at UTC midnight from an exact `YYYY-MM-DD` value. Impossible days are rejected instead of rolling over. A supplied `remarks` value must be a string of at most 1000 characters.
- Class-log month/year filters use UTC calendar boundaries. A year-only request selects that full year, a month requires a year, and malformed values are controlled 400s.
- Academic Manager class-log approval is branch-scoped. All four approval endpoints require a non-empty `managedBranch`. Responses contain only the manager's own entry, with `totalClasses` and `approvalStatus` recomputed for that entry, and the stored `ClassLog` is never shaped in place. Another branch's entries, approvers, timestamps, and rejection reasons are never returned.
- Class-log decisions are single-document atomic updates guarded by a `Pending` entry for the manager's branch, and they recalculate the stored top-level `approvalStatus` in the same operation. Only a `Pending` entry can be decided, and a re-review is a controlled 409. A stale document never rewrites `entries`, so decisions on different branches are both preserved.
- A class-log rejection reason must be a string of 3 to 300 characters after trimming. An invalid reason is a controlled 400 that writes nothing.
- Administrator user writes validate typed identity fields, passwords, roles, and complete role-specific assignments before mutating a user. Unknown assignments and newly acquired inactive assignments are rejected, while an existing inactive assignment may remain with its current owner.
- Administrator partial user updates re-resolve retained branch, subject, and managed-branch records, so a deleted assignment cannot be silently preserved. Executive Office scope is always cleared, duplicate-email races remain controlled, and user responses omit credential material.

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
- C20B: authentication and password reset hardening — `e5689b3`
- C20C: role access enforcement and seed route removal — `b073fb9`
- C20D: legacy QR and marks integration retirement — `5b82609`
- C20E: lecturer assignment enforcement — `6b36c37`
- C20F: workbook mutation integrity — `3b2258d`
- C20G: class log approval integrity and branch privacy — `c5322b3`
- C20H: administrator user and assignment integrity — `85a8534`

## Current task

C20I: Responsive Administrator User Management. See `docs/agent/NEXT.md`.
