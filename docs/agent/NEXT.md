# Checkpoint C20E: Lecturer Assignment Enforcement

Status: READY

## Objective

Lecturer branch and subject assignments become administrator-only and are enforced server-side when academic records are created.

## Allowed files

- `docs/agent/NEXT.md`
- `backend/src/controllers/authController.js`
- `backend/src/controllers/classLogController.js`
- `backend/src/controllers/workbookController.js`
- `backend/src/controllers/attendanceSessionController.js`
- `backend/src/utils/lecturerAssignmentScope.js` (new)
- `frontend/src/pages/Profile.jsx`

Do not edit other files. If another file is required, stop and explain why.

## Required behavior

- `PUT /api/auth/profile` may update only `name` and `phone`. A body containing `branches`, `subjects`, `managedBranch`, `role`, `isActive`, `tokenVersion`, or `email` is rejected with 403 `Assignments and account permissions can only be changed by the System Administrator.` Supplied `name`/`phone` must be strings, a blank normalized name is rejected with 400, and the existing `User.SAFE_FIELDS` response projection is preserved.
- `Profile.jsx` submits only `{ name, phone }`, removes branch/subject checkboxes, no longer calls the branches or subjects APIs, shows current assignments read-only (Lecturer branches and populated subject names, Academic Manager managed branch, other roles role/account only), and shows `Assignments are managed by the System Administrator.` while preserving refresh, editing, success/error states, and responsive layout.
- `backend/src/utils/lecturerAssignmentScope.js` normalizes user branch values safely, requires an exact match against `req.user.branches`, requires the branch to exist and be active in the `Branch` collection, requires the subject to be an active `Subject` whose `_id` is present in `req.user.subjects`, trusts only database-backed records, and throws controlled 403 errors `You are not assigned to this branch.` / `You are not assigned to this subject.`. Empty, malformed, missing, and populated/unpopulated assignment values are handled without throwing unhandled errors, and no dependency is added.
- `POST /api/class-logs` and `PUT /api/class-logs/:id` validate supplied entries: non-empty array, every entry a string branch assigned to the lecturer, no duplicate branches, `classes` an integer 1–20, malformed payloads rejected with controlled 400, unassigned or inactive branches rejected with the helper's controlled 403, and `totalClasses` summed only from validated integers. Lecturer ownership and the approval-reset behavior are preserved, and updating only date or remarks does not revalidate unchanged historical entries.
- `POST /api/workbook/sheets` validates and normalizes batch, branch, subject, and year before any mutation, requires current assignment to the active branch and active subject, stores the normalized values in `name`, `year`, `batch`, `branch`, and `subject`, and preserves duplicate-sheet detection and the response shape.
- `POST /api/attendance-sessions` verifies after the owned workbook and selected sheet are resolved that the lecturer is currently assigned to the selected sheet's branch and subject, returns controlled 403 for removed or unassigned branch or subject, and preserves roster snapshot, year, session code, ownership, index-0, legacy compatibility, and cancellation behavior.
- Existing workbook sheets, class logs, attendance sessions, and the Super Admin assignment workflow remain readable and unchanged; no model, route, middleware, admin UI, or admin-controller change is made; no migration runs and no existing record is rewritten.

## Out of scope

- Model, route, middleware, admin UI, and admin-controller changes.
- Database migrations, seeding, or any rewrite of existing records.
- Authorization changes to attendance reports, class-log approval, or other workbook sheet mutations.
- Runtime, Atlas, concurrency, and browser verification.

## Acceptance checks

- `PUT /api/auth/profile` with `{ name, phone, branches: [] }` returns 403 and leaves assignments unchanged; a body with only `name`/`phone` updates just those fields.
- `POST /api/class-logs` with a non-array, empty, duplicated-branch, non-integer, or out-of-range `classes` value returns controlled 400; an assigned-and-active branch succeeds; an unassigned or inactive branch returns 403.
- `POST /api/workbook/sheets` stores sanitized values, rejects unassigned branch or subject with 403, and still reports `This sheet already exists.` for duplicates.
- `POST /api/attendance-sessions` with a crafted `workbookId`/`sheetIndex` for a sheet whose branch or subject is no longer assigned returns controlled 403 and creates no session.
- `Profile.jsx` renders read-only assignments, submits only `{ name, phone }`, and issues no branches or subjects request.
- `node --check` passes for every changed backend file, `cd frontend && npm run build` passes, and `node scripts/harness/verify-static.mjs` passes.

## Verification

- `node --check` on each changed backend JavaScript file.
- `cd frontend && npm run build`.
- `node scripts/harness/verify-static.mjs`.
- `git diff --check` and `git status --short`.
- Full diff review of every allowed file.
- Codex performs the runtime and browser verification; this checkpoint stops after static verification.

## Delivery constraints

Do not stage, commit, push, or deploy. Preserve local state on failure and report the actual changed files and checks executed.
