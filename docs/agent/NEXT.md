# Checkpoint C14: Resume and Review Attendance Sessions

Status: READY

## Objective

Give lecturers a session index on the attendance-session page so they can reopen active sessions to continue attendance and open closed sessions for read-only review, using the existing `getMySessions` API and existing session detail route.

## Allowed files

- `frontend/src/pages/StartSession.jsx`
- `frontend/src/components/Sidebar.jsx`

Do not edit other files. If another file is required, stop and explain why.

## Required behavior

- Import and call the existing `getMySessions` API from `StartSession`; do not add or change backend endpoints or the API wrapper.
- Keep the existing workbook-sheet session creation flow and its validation, payload, error handling, and navigation to `/session/:id/checkins`.
- Add a lecturer-visible sessions area on the same page, with active sessions separated from closed sessions. Preserve the API's newest-first order within each group.
- Render each session from the list response with enough context to identify it: subject (with a clear fallback when blank), branch, batch, session date, current Active/Closed status, and `checkinCount`.
- Give active sessions a `Resume` action and closed sessions a `Review` action. Both actions must navigate to the existing `/session/:id/checkins` route; `SessionCheckins` remains responsible for editability and read-only enforcement.
- Fetch workbook data and session-list data independently. A workbook load failure or a workbook with no sheets must not hide or disable the session list, and a session-list failure must not prevent starting a new session from an otherwise valid workbook.
- Show a distinct loading state for the session list, a useful empty state when the lecturer has no sessions, and an inline list-specific error with a retry action. Retrying the list must not reload or clear workbook/sheet selection state.
- Avoid issuing one request per session: use only the fields and `checkinCount` already returned by `getMySessions` for the index.
- Keep the page usable at narrow/mobile widths and use semantic buttons/links with visible keyboard focus. Status and action text must not rely on color alone.
- Rename the lecturer sidebar item from `Start Session` to `Attendance Sessions` while keeping its existing `/start-session` route and lecturer-only placement.
- Preserve existing handling of legacy, snapshot-backed, empty-roster, and incomplete-linkage sessions after navigation; do not duplicate those rules in the index.

## Out of scope

- Backend, model, route, authentication, authorization, or database changes.
- Changes to `frontend/src/api/attendanceSessionApi.js`, `SessionCheckins.jsx`, or application routing.
- Pagination, filtering, searching, deleting, reopening, or editing closed sessions.
- Automatic polling or live updates to session counts.
- Changes to student self-check-in or executive/academic-manager views.
- Dependency updates or new test tooling.

## Acceptance checks

- A lecturer with active and closed sessions sees two clearly labeled groups in newest-first order, with the required identifying fields and counts.
- Selecting `Resume` for an active session opens `/session/<id>/checkins`, where the existing active-session behavior is preserved.
- Selecting `Review` for a closed session opens `/session/<id>/checkins`, where the existing closed-session read-only message and controls are preserved.
- A lecturer with no sessions sees the empty state and can still create a session from a workbook sheet.
- If the workbook request fails, the sessions request can still succeed and its Resume/Review actions remain usable; only the creation area shows its retry/error state.
- If the sessions request fails, the workbook creation flow remains usable and the lecturer can retry only the session list without losing the selected sheet.
- A workbook with no sheets still shows the Marks Management guidance and any existing sessions.
- No additional per-session API calls are made while rendering the index, and no non-lecturer navigation is changed.

## Verification

- Run `node scripts/harness/verify-static.mjs` from the repository root; this must include a successful frontend production build and `git diff --check`.
- Inspect the actual diff and confirm only the two allowed files changed during implementation.
- Browser-check at desktop and narrow/mobile widths with controlled API responses for: mixed active/closed sessions, no sessions, workbook failure with successful sessions, session-list failure with successful workbook, and workbook with no sheets plus existing sessions.
- Confirm Resume and Review navigate to the correct existing detail URLs and that a closed session remains read-only on the detail page.
- Confirm the lecturer sidebar says `Attendance Sessions`, while Academic Manager, Executive Office, and Super Admin navigation remains unchanged.
- If browser verification uses a live backend, use a newly named temporary database, verify the database-name guard before inserting fixtures, and drop that temporary database afterward. Never connect the test to an existing or production database.

## Delivery constraints

Do not stage, commit, push, or deploy. Preserve local state on failure and report the actual changed files and checks executed.
