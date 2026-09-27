# Checkpoint C20G: Class Log Approval Integrity and Branch Privacy

Status: READY

## Objective

An Academic Manager only ever sees and decides their own branch entry, and a class log decision is recorded by one atomic document update that no concurrent request can overwrite.

## Allowed files

- `docs/agent/NEXT.md`
- `docs/agent/STATE.md`
- `backend/src/controllers/attendanceApprovalController.js`
- `backend/src/controllers/classLogController.js`

Do not edit other files. If another file is required, stop and explain why.

## Required behavior

- All four attendance-approval endpoints require a non-empty `req.user.managedBranch` and keep the existing controlled 400 `No managed branch assigned to this Academic Manager.` for a missing, blank, or non-string value. Approve and reject previously matched an empty branch and reported a scope error instead.
- `GET /api/attendance/pending` and `GET /api/attendance/all` keep their top-level `{ success, count, data }` shape and return, for every log, `entries` containing exactly the manager's matching entry. Response-only `totalClasses` and `approvalStatus` are recomputed from that scoped entry, and the stored `ClassLog` is never modified while shaping a response. Other branches' entries, class counts, statuses, approvers, timestamps, and rejection reasons are never exposed. The same scoped shape is returned after approve and reject.
- Approve and reject replace read-modify-save with one atomic single-document update whose guard requires a `Pending` entry for the manager's branch. A stale `ClassLog` never writes `entries`. Concurrent decisions on different branches are both preserved, and concurrent decisions on the same branch allow exactly one success. A reviewed entry returns 409 `This branch entry has already been reviewed.`, a missing log returns 404 `Class log not found.`, and a log without the manager's branch returns 403 `You can only review entries for your managed branch.` Only the matching branch entry is updated.
- Approve sets `approvalStatus = "Approved"`, `approvedBy = req.user._id`, `approvedAt` to one shared current timestamp, and `rejectionReason = ""`. Reject sets `approvalStatus = "Rejected"`, the normalized `rejectionReason`, `approvedBy = null`, and `approvedAt = null`. The stored top-level `approvalStatus` is recalculated from the updated entries inside the same atomic operation (any `Rejected` wins, otherwise all `Approved`, otherwise `Pending`), `updatedAt` is preserved, and no transaction is added.
- `rejectionReason` must be a string, is trimmed, and must be 3 to 300 characters after trimming. Arrays, objects, numbers, `null`, blank text, fewer than 3, and more than 300 return controlled 400 with `Rejection reason must be a string.`, `Rejection reason must be at least 3 characters.`, and `Rejection reason must be 300 characters or fewer.` An invalid request performs no write.
- Class-log requests treat a missing, `null`, array, or non-object `req.body` as an empty payload. Creation requires a real `YYYY-MM-DD` calendar date and stores it deterministically at UTC midnight; updates validate the date whenever the field is supplied, so blank, `null`, and non-string values are rejected. Impossible dates such as `2026-02-30` and padded or trailing input return 400 `Date must be a valid YYYY-MM-DD calendar date.`
- `remarks` is optional, but a supplied value must be a string, is trimmed, and is limited to 1000 characters with a controlled 400 for an invalid type or length. Existing entry validation, assignment enforcement, lecturer ownership, response shapes, the approval reset when entries are edited, historical reads, and the rule that client-supplied approval metadata never enters stored entries are preserved.
- `GET /api/class-logs/my` accepts an optional canonical `year` from 2000 to 2100 and an optional canonical `month` from 1 to 12. A year without a month selects the full year, preserving the lecturer UI's All-month request; a month without a year is rejected. Padded, signed, decimal, exponent, trailing-text, array, and object values return a controlled 400. UTC half-open ranges align filtering with the UTC-midnight stored calendar days. Lecturer ownership and historical branch filtering are preserved.

## Out of scope

- Frontend, routes, models, middleware, and dependency changes.
- Changing the lecturer or Academic Manager user experience.
- Deleting class logs or creating a cancellation workflow.
- Database migrations, seeding, or any rewrite of existing records.
- Atlas, runtime, concurrency, and browser verification during this OpenCode pass.

## Acceptance checks

- An Academic Manager never receives another branch's entries, class counts, statuses, approvers, timestamps, or rejection reasons from any of the four endpoints.
- A missing `managedBranch` returns the controlled 400 on pending, all, approve, and reject.
- Non-string, blank, too short, and too long rejection reasons return controlled 400 and write nothing.
- Two concurrent decisions for the same branch produce exactly one success and one 409.
- Concurrent decisions for two different branches of one log are both preserved.
- The stored top-level `approvalStatus` stays consistent with the entries after every decision.
- Invalid or impossible class-log dates return 400, and the leap day `2028-02-29` is accepted.
- A canonical year-only filter selects the full year; a month without a year and invalid, padded, signed, decimal, exponent, array, or object `month`/`year` values return 400.
- Lecturer ownership, assignment enforcement, and existing approval reset behavior remain intact.

## Verification

- `node --check backend/src/controllers/attendanceApprovalController.js` and `node --check backend/src/controllers/classLogController.js`.
- `cd frontend && npm run build`.
- `node scripts/harness/verify-static.mjs`.
- `git diff --check` and `git status --short`.
- Full review of the actual diff for every allowed file.
- Codex performs the temporary-database, concurrency, and browser verification; this checkpoint stops after static verification.

## Delivery constraints

Do not stage, commit, push, or deploy. Preserve local state on failure and report the actual changed files and checks executed.
