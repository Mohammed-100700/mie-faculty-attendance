# Checkpoint C20F: Workbook Mutation Integrity

Status: READY

## Objective

Malformed workbook mutation requests can no longer delete or change the wrong sheet, test, student, or mark, and every workbook mutation requires the lecturer's current branch and subject assignments.

## Allowed files

- `docs/agent/NEXT.md`
- `backend/src/controllers/workbookController.js`

Do not edit other files. If another file is required, stop and explain why.

## Required behavior

- One reusable index parser in `workbookController.js` accepts only canonical non-negative decimal integers (`0`, `1`, `2`, …) supplied as a route string or an exact integer number, preserves index `0`, and rejects blank values, whitespace padding, leading zeros, signs, negatives, decimals, exponent notation, trailing text, arrays, objects, booleans, and non-safe integers. Failures raise controlled 400 errors with exactly `Invalid sheet index.`, `Invalid test index.`, `Invalid student index.`, or `Invalid column index.` No unvalidated route parameter is passed to array indexing, `splice()`, mark lookup, or Mongoose subdocument access.
- Existence checks are controlled: missing workbook `404 Workbook not found.`, missing sheet `404 Sheet not found.`, missing test `404 Test not found.`, missing student `404 Student not found.`, missing mark `404 Mark not found.`. No invalid index may delete index `0`, delete the last array item, mutate a different entry, produce a 500, or return success without performing the requested mutation.
- Before mutating an existing sheet, `deleteSheet`, `addTest`, `deleteTest`, `addStudent`, `updateStudentNcukId`, `deleteStudent`, `updateMark`, and `toggleTestApproval` call the C20E helpers `assertAssignedBranch(req, sheet.branch)` and `assertAssignedSubject(req, sheet.subject)`. A removed, unassigned, or inactive branch/subject returns the existing controlled 403 and leaves the workbook and the canonical `Student` unchanged. `getWorkbook` and `getAllWorkbooks` are unchanged so historical sheets stay readable.
- `updateStudentNcukId` uses the shared parsed indexes, validates and authorizes the sheet before opening its transaction, rechecks sheet and student existence after re-fetching inside the transaction, never uses the raw route values, and preserves canonical `Student` synchronization, legacy-row behavior, duplicate preflight, MongoDB 11000 to 409 conversion, transaction rollback, and session cleanup.
- `syncMarks` authorizes every sheet first, then mutates, so no partial mutation happens before an authorization decision. Sheets whose branch or subject is no longer assigned or active are skipped instead of failing the sync; the response keeps the existing `Synced N missing mark entries.` message and workbook data, adds `skippedSheetCount`, and preserves mark ordering.
- `addTest` requires `testName` to be a string that is still non-empty after sanitization, requires `maxMarks` to normalize to an integer from 1 through 1000 with a controlled 400 instead of silently falling back to 100, keeps 100 only when `maxMarks` is absent or blank, and requires `assessmentDate` to be a real `YYYY-MM-DD` calendar date so impossible values such as `2026-02-30` are rejected. `deleteTest` and `toggleTestApproval` require valid indexes and existing records before mutating.
- `addStudent` requires `name`, `ncukId`, and `mieStudentId` to be strings when supplied, preserves the three identity-resolution paths, canonical `Student` creation, collision retry, and best-effort rollback, and rejects a canonical student already present in the same sheet with `409 Student already exists in this sheet.` before the row is pushed, without creating or deleting a canonical `Student`. `deleteStudent` validates both indexes and existence before `splice` and deletes only the workbook row.
- `updateMark` validates `sheetIndex`, `studentIndex`, and `colIndex`, requires `colIndex` to be a positive integer that matches an existing mark entry, requires `value` to be a string, preserves blank marks and sanitization, and returns the controlled 404 for a missing mark instead of a successful no-op.
- Compatibility is preserved: lecturer workbook ownership, C20E assignment helpers and messages, index `0` behavior, NCUK canonical transaction behavior, workbook response shapes except the added `syncMarks.skippedSheetCount`, existing frontend API contracts, report and attendance behavior, and existing historical records.

## Out of scope

- Route, model, middleware, frontend, and dependency changes.
- `getWorkbook` and `getAllWorkbooks` read paths and historical sheet visibility.
- Database migrations, seeding, or any rewrite of existing records.
- Tests that require Atlas during the OpenCode pass.
- Runtime, Atlas, concurrency, and browser verification.

## Acceptance checks

- `DELETE /api/workbook/sheets/foo`, `/sheets/-1`, and `/sheets/1.5` return 400 and delete no sheet.
- A valid index `0` mutation targets only sheet `0`.
- Invalid test or student indexes return controlled 400 or 404 and mutate nothing.
- `updateMark` with `colIndex=1abc` returns 400; a valid but missing column returns 404.
- A duplicate canonical student in one sheet returns 409 with no extra workbook row and no `Student` document.
- An inactive or unassigned sheet cannot be mutated by any workbook mutation route.
- `syncMarks` skips unassigned sheets and reports `skippedSheetCount`.
- `addTest` rejects an invalid `maxMarks` and an impossible `assessmentDate`.
- `updateStudentNcukId` transaction, legacy-row, and duplicate behavior is unchanged.

## Verification

- `node --check backend/src/controllers/workbookController.js`.
- `cd frontend && npm run build`.
- `node scripts/harness/verify-static.mjs`.
- `git diff --check` and `git status --short`.
- Full review of the actual diff for both allowed files.
- Codex performs the temporary-database and browser verification; this checkpoint stops after static verification.

## Delivery constraints

Do not stage, commit, push, or deploy. Preserve local state on failure and report the actual changed files and checks executed.
