# Checkpoint C20H: Administrator User and Assignment Integrity

Status: READY

## Objective

A Super Admin cannot create or update a user with malformed identity fields, unknown assignments, duplicate assignments, or newly assigned inactive branches and subjects. Existing valid admin workflows and historical inactive assignments remain usable.

## Allowed files

- `backend/src/controllers/adminController.js`
- `docs/agent/NEXT.md`
- `docs/agent/STATE.md`

Do not edit other files. If another file is required, stop and explain why.

## Required behavior

- Only a non-null, non-array object is treated as a request body. A missing, `null`, array, or scalar body is a controlled 400 for every admin write endpoint. No value is trimmed, lowercased, matched, or length-checked before its type is known, and an invalid request never partially mutates a user.
- `name` is a string, trimmed, 2 to 100 characters. `email` is a string, trimmed, lowercased, a reasonable address, and at most 254 characters. `phone` is optional and, when supplied, is a trimmed string of at most 30 characters. `role` is exactly `Lecturer`, `Academic Manager`, or `Executive Office`. Super Admin creation and role assignment stay forbidden with the existing 403 messages, and every existing Super Admin edit, status, and password protection is preserved.
- `createUser` `password` and `resetPassword` `temporaryPassword` are strings of 6 to 128 characters. Password hashing and `tokenVersion` invalidation are unchanged, and a malformed reset leaves the password and `tokenVersion` untouched.
- Lecturer `branches` and `subjects` must be arrays. `null`, scalars, objects, and nested arrays are rejected. Branch names are trimmed; blank and duplicate names are rejected. Subject entries must be canonical 24-character ObjectId strings, compared in canonical form, so a duplicate is caught even when the case differs. Unknown or inactive new assignments are controlled 400s. Assignments are resolved with one bulk query per collection rather than one query per value, and canonical `Branch.name` values and canonical Subject ObjectIds are stored.
- An inactive branch or subject already assigned to the same user may remain selected or be removed when that user is updated. An inactive assignment the user does not already hold cannot be added, and an unknown assignment is never preserved or added. Subject assignments are compared canonically by ObjectId string.
- `managedBranch` is required for an Academic Manager and resolves to the canonical `Branch.name`. Creating an Academic Manager or converting another role requires an existing active branch. An existing Academic Manager may keep a currently inactive managed branch or replace it with an active one; a different inactive, missing, or unknown branch is rejected. Academic Managers store `branches=[]` and `subjects=[]`.
- Executive Office users always store `branches=[]`, `subjects=[]`, and `managedBranch=null`. The role is validated first, then any client-supplied academic scope is explicitly cleared rather than interpreted.
- `updateUser` validates the complete proposed state before assigning any field to the loaded document, so a rejected update leaves `name`, `email`, `phone`, `role`, `branches`, `subjects`, and `managedBranch` unchanged. The frontend contract, which sends the role and the complete role-specific assignment set, is preserved: an omitted `branches` or `subjects` field keeps the stored assignment rather than clearing it, but re-resolves it so a deleted or unknown record cannot be preserved; `managedBranch` follows the same rule. An unchanged valid email is still accepted, duplicate emails keep the existing controlled `A user with this email already exists.` message, and a duplicate-key race is converted into that same controlled response instead of a raw MongoDB error.
- Response shapes and status codes are preserved except where malformed input previously caused an uncontrolled failure. Responses continue to omit `password`, `resetPasswordToken`, `resetPasswordExpires`, and `emailAppPassword`, and never expose token or credential material.
- Branch and subject create, edit, and status endpoints are unchanged apart from the shared body-shape guard, which prevents an uncontrolled failure for a non-object body.

## Out of scope

- Frontend, routes, middleware, models, and dependency changes.
- Branch and subject field-level validation, name immutability rules, or endpoint redesign.
- Changing role names.
- Deleting users or academic records.
- Database migrations, seeding, or any rewrite of existing records.
- Atlas, runtime, and browser verification during this OpenCode pass.

## Acceptance checks

- Arrays, objects, and numbers supplied for string fields return a controlled 400 and never a 500.
- A malformed password-reset value returns a controlled 400 and changes neither the stored password nor `tokenVersion`.
- Duplicate branch names and duplicate subject IDs return a controlled 400.
- Unknown branch, subject, and managed-branch assignments return a controlled 400.
- A new inactive assignment returns a controlled 400.
- An existing inactive assignment may remain selected on the same user and may be removed.
- A user cannot acquire an inactive assignment they did not already have.
- Academic Manager managed-branch rules are enforced on create, on role change, and on update.
- Executive Office users have their academic assignments cleared.
- A rejected update leaves the complete stored user unchanged and performs no save.
- A duplicate-email race produces the existing controlled error message.
- Valid create, edit, role-change, status, and password-reset workflows still succeed.
- No response contains password, reset, or app-password material.

## Verification

- `node --check backend/src/controllers/adminController.js`.
- `cd frontend && npm run build`.
- `node scripts/harness/verify-static.mjs`.
- `git diff --check` and `git status --short`.
- Full review of the actual diff for every allowed file.
- Codex performs the temporary-database and browser verification; this checkpoint stops after static verification.

## Delivery constraints

Do not stage, commit, push, or deploy. Preserve local state on failure and report the actual changed files and checks executed.
