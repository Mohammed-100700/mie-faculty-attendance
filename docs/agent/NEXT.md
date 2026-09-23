# Checkpoint C17.5: Unified Lecturer Attendance Workspace

Status: READY

## Objective

Make lecturer attendance sessions as clear and visually consistent as Marks Management by using the same class-sheet context, compact hierarchy, and roster-table language while preserving all C12-C14 attendance behavior.

## Allowed files

- `frontend/src/pages/StartSession.jsx`
- `frontend/src/pages/SessionCheckins.jsx`

Do not edit other files. If another file is required, stop and explain why.

## Required behavior

- Keep the existing routes, API helpers, backend payloads, session state, and authorization unchanged.
- Restyle Attendance Sessions around the Marks Management visual language: clear page heading, workbook-sheet selectors grouped by batch, year/branch/batch/subject context badges, compact cards or rows, consistent spacing, and established button/focus styles.
- Sheet selection must preserve the original workbook array index, including index `0`. Do not sort or reconstruct an index that is sent to the API.
- The selected sheet must be visually obvious and expose one clear primary `Start Attendance` action. Starting a session must keep the existing `createSessionFromSheet` payload and navigate to `/session/:id/checkins`.
- Keep workbook loading/error/retry independent from session-list loading/error/retry. A failure in one request must not hide or reset successful data from the other.
- Preserve the no-workbook/no-sheets guidance and link to Marks Management.
- Present existing sessions in compact Active and Closed views with visible counts, newest-first API ordering, class context, date, present count, and clear Resume or Review actions. Do not make per-session API calls.
- Restyle the linked Session Attendance page with a marks-like class header using year, batch, branch, subject, date, and Active/Closed status badges.
- Present Roster, Present, and Absent as readable summary cards. Display unsaved state clearly without using modal alerts.
- Present the roster as a clean attendance table at desktop widths and readable stacked rows/cards at narrow widths. Each student must retain name, MIE ID, NCUK ID or `—`, current Present/Absent state, and an accessible checkbox when editable.
- Keep local checkbox editing only. Toggling a student must not call the API.
- Keep Select All operating on the complete roster, Clear All selecting zero students, and saving an empty selected set as valid attendance.
- Preserve set-based dirty-state comparison. Selection order alone must never create a dirty state.
- Keep an explicit Save Attendance action. Save sends the complete selected set, adopts the server-returned present set and summary, and preserves local selections with a visible error when saving fails.
- Keep Close Session separate from Save. Dirty attendance must block closing with `Save attendance before closing the session.` Closed sessions must become read-only and show no Save, Select All, Clear All, or Close controls.
- Keep snapshot-backed active sessions editable, snapshot-backed closed sessions read-only, pre-C10 linked sessions read-only with the newer-session message, and legacy sessions in their existing read-only compatibility view.
- Keep QR and lecturer self-check-in sharing controls absent.
- Avoid invalid nested interactive controls. Buttons, labels, checkboxes, tabs, and links must have valid semantics, visible keyboard focus, and usable touch targets.
- Keep the pages usable without horizontal page overflow at approximately 1440 px, 768 px, and 390 px widths.

## Out of scope

- Backend, database, model, controller, middleware, route, or API-helper changes.
- Executive Office or Academic Manager attendance-report redesign.
- Session deletion, cancellation, restoration, or editing of closed attendance.
- Changes to attendance calculations, student identity, `studentRef`, roster snapshots, MIE IDs, or NCUK synchronization.
- PDF/Excel changes, email delivery, charts, or new dependencies.
- C18 authentication, webhook, dependency, rate-limit, or security work.
- Staging, committing, pushing, or deploying.

## Acceptance checks

- Lecturer sees workbook sheets grouped by batch with year, branch, subject, and student count; selecting original sheet index `0` works.
- Start Attendance has one obvious primary action and creates the same sheet-backed session as before.
- Active and Closed session views remain available with correct counts and Resume/Review navigation.
- Workbook failure leaves sessions usable; session-list failure leaves sheet selection and Start Attendance usable; each retry only refreshes its own request.
- An active snapshot-backed session loads every roster student with saved present rows checked and absent rows unchecked.
- A checkbox change updates local Present/Absent counts and unsaved state without a network save.
- Select All selects the complete roster, Clear All selects none, and Save accepts `[]`.
- Successful save persists after reload; failed save preserves the local selection and displays the backend message.
- Dirty close is blocked; clean close succeeds and immediately produces a read-only page.
- Closed snapshot, pre-C10 linked, and legacy sessions remain read-only with their existing compatibility messages and data.
- Student name, MIE ID, NCUK ID or `—`, and Present/Absent state remain readable on desktop and mobile.
- Keyboard users can select a sheet, toggle attendance, save, close, resume, and review with visible focus indicators.
- No QR/session-code sharing UI returns and no per-checkbox or per-session request is introduced.
- At approximately 1440 px, 768 px, and 390 px widths, no page-level horizontal overflow or clipped action controls occur.

## Verification

OpenCode implementation gate:

- Run `node scripts/harness/context.mjs` before editing.
- Modify only the two allowed frontend files.
- Run `node scripts/harness/verify-static.mjs`.
- Run `git diff --check`, `git status --short`, and inspect the complete diff for both allowed files.
- Do not perform Atlas/runtime or browser verification. Stop before staging and report exact files, commands, results, and uncertainties.

Codex final gate after implementation:

- Inspect the actual source and complete diff; verify index preservation, independent request states, editability rules, set-based dirty state, full-set save semantics, empty save, and close protection.
- Run the frontend production build and repository static harness.
- Browser-test against controlled data for active snapshot, closed snapshot, pre-C10 linked, and legacy sessions. Verify reload persistence, save failure preservation, dirty/clean close behavior, and absence of per-checkbox requests.
- Check desktop, tablet, narrow mobile, keyboard focus, and browser console errors.
- Re-run static verification after any repair and inspect the final diff.

## Delivery constraints

Do not stage, commit, push, or deploy. Preserve local state on failure and report the actual changed files and checks executed.
