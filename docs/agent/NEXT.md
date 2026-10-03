# Checkpoint C20I: Responsive Administrator User Management

Status: READY

## Objective

The Super Admin Users page remains fully usable at phone, tablet, and desktop widths without page-level horizontal overflow, while preserving every C20H user-management behavior.

## Allowed files

- `frontend/src/pages/AdminUsers.jsx`
- `docs/agent/NEXT.md`
- `docs/agent/STATE.md`

Do not edit other files. If another file is required, stop and explain why.

## Required behavior

- At widths below the existing Tailwind `lg` breakpoint, render each filtered user as a compact card rather than rendering the six-column table. Each card shows the user's name, email, displayed role, assignment, status, and the same actions available on desktop.
- At `lg` and wider, preserve a semantic six-column table in this order: Name, Email, Role, Assignment, Status, Actions. Keep it inside an `overflow-x-auto` container as a defensive fallback. Column headers use `scope="col"`, and the user-name cell uses `scope="row"`.
- The mobile/tablet card view and desktop table are two responsive presentations of the same `filteredUsers` data. Do not duplicate fetching, filtering, mutations, or modal state. Use `user._id` as the stable key in both presentations.
- Preserve the existing role label mapping, assignment rules, active semantics, status colors, protected Super Admin behavior, Edit action, Activate/Deactivate flow, status confirmation modal, reset-password menu, Add User flow, and Edit User flow.
- Long names, email addresses, branch names, and assignment text wrap within their container. Remove or replace page-expanding `whitespace-nowrap` behavior from user content. Action controls may wrap and must remain reachable without horizontal page scrolling.
- The page heading and top actions remain clear at every width. Filters use one column on narrow phones, two columns from `sm`, and up to four columns from `lg`. Search, role, and status filter behavior remains unchanged.
- When filters match no users, show one clear `No users found.` state at every breakpoint. Do not render duplicate empty states from the table and card layouts.
- Existing loading and API-error states remain unchanged. No new API calls are added, and changing a filter remains local.
- Interactive controls changed in this file retain visible keyboard focus. Cards use suitable semantic structure and an accessible label tied to the user's name. Do not add click handlers to non-interactive containers.
- At 390px, 768px, and 1440px viewport widths, `document.documentElement.scrollWidth` and `document.body.scrollWidth` must not exceed `window.innerWidth`. There must be no clipped content or page-level horizontal scrollbar.

## Out of scope

- Backend, API, routing, authentication, authorization, models, and dependency changes.
- Changing C20H validation or assignment behavior.
- Editing Add User, Edit User, Reset Password, status confirmation, Status Menu, Sidebar, Layout, or shared CSS components.
- Redesigning the Branches or Subjects administrator pages.
- New pagination, sorting, bulk actions, deletion, or data exports.
- Staging, committing, pushing, or deploying during the OpenCode pass.

## Acceptance checks

- At 390px, users appear as cards and the page has no horizontal overflow.
- At 768px, users remain in the responsive card presentation and the page has no horizontal overflow.
- At 1440px, users appear in the semantic six-column table and the page has no horizontal overflow.
- Every user presentation includes name, email, role, assignment, status, and the appropriate actions.
- Super Admin still shows `Protected account` and cannot be edited, deactivated, or reset from this page.
- Lecturer, Academic Manager, and Executive Office users retain Edit, Activate/Deactivate, and Reset Password access.
- Search, role filter, and status filter produce the same result set in both responsive presentations.
- A filtered-empty result renders exactly one `No users found.` message.
- Add, edit, status confirmation, and reset-password modal state and callbacks are unchanged.
- No request shape, endpoint, role rule, or user mutation behavior changes.

## Verification

- Run `node scripts/harness/context.mjs` before editing.
- Run `cd frontend && npm run build`.
- Run `node scripts/harness/verify-static.mjs`.
- Run `git diff --check`, `git status --short`, and inspect the complete diff for all three allowed files.
- Confirm source contains one `hidden lg:block` desktop table wrapper and one `space-y-3 lg:hidden` mobile/tablet card wrapper, with no always-visible user table.
- Codex performs final browser verification at 390px, 768px, and 1440px after the static gate.

## Delivery constraints

Do not stage, commit, push, or deploy. Preserve local state on failure and report the actual changed files, verification evidence, and any file required outside the allowed list.
