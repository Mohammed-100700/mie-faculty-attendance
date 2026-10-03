# Checkpoint C20J: Authenticated Self-Service Password Change

Status: READY

## Objective

Every authenticated staff member can replace an administrator-issued temporary password from Settings by proving the current password. A successful change invalidates every older token while keeping the current browser signed in with a newly issued token.

## Allowed files

- `backend/src/controllers/authController.js`
- `backend/src/routes/authRoutes.js`
- `frontend/src/api/authApi.js`
- `frontend/src/pages/Settings.jsx`
- `docs/agent/NEXT.md`
- `docs/agent/STATE.md`

Do not edit other files. If another file is required, stop and explain why.

## Required behavior

- Add protected `PUT /api/auth/password`. It is available to every active authenticated role through the existing `protect` middleware and does not alter role or assignment authorization.
- Only a non-null, non-array object is a valid request body. The endpoint accepts exactly `currentPassword` and `newPassword`; unknown fields are rejected with a controlled 400. Both values must be strings before any length comparison or password operation.
- Password values are never trimmed. `currentPassword` must be non-empty and at most 128 characters. `newPassword` must be 6 to 128 characters. Arrays, objects, numbers, `null`, blank current passwords, and invalid new-password lengths return controlled 400 responses.
- Load the authenticated user with the password hash explicitly selected. A missing user returns the existing protected-auth style 401 response. An incorrect current password returns controlled 400 `Current password is incorrect.` so the global Axios 401 interceptor does not incorrectly log out a valid session.
- Reject reuse of the current password with controlled 400 `New password must be different from the current password.` Compare against the stored hash rather than comparing plaintext strings.
- Hash the accepted new password with bcrypt using the same cost currently used by the User pre-save hook. Update the password and increment `tokenVersion` in one guarded atomic write whose filter includes the loaded token version. Do not call `save()` with an already hashed password, and never store plaintext.
- If the guarded write loses a concurrent password-change race, return controlled 409 `Password was changed in another session. Please sign in again.` without overwriting the winning password or token version.
- Clear the unused legacy `resetPasswordToken` and `resetPasswordExpires` fields during the successful atomic password update. Do not expose those fields or any password material.
- After success, issue a JWT from the updated user and return the existing safe user fields plus `token`, using the same `{ success, message, data }` style as login. The token contains the incremented `tokenVersion`; every previously issued token fails on its next protected request.
- Add `changePassword(data)` to `frontend/src/api/authApi.js` and a Security / Change Password form to Settings with Current Password, New Password, and Confirm New Password fields.
- The frontend requires all three fields, validates new-password length 6–128, rejects a mismatch, and rejects a new password equal to the entered current password before calling the API. Backend validation remains authoritative.
- On success, call the existing AuthContext `loginUser` function with the returned safe user and token so local storage and in-memory user state are replaced together. Clear all password inputs and show a visible success message explaining that other sessions were signed out.
- On API failure, keep the form open, preserve the entered values, and display the backend message inline. Disable the submit button while the request is pending and prevent double submission.
- Use password autocomplete values `current-password` and `new-password`, associated labels, visible keyboard focus, `role="alert"` for errors, and a polite status region for success. The form must not log passwords or place them in URLs.
- The Settings account-information and About sections remain present, and the new form is responsive without horizontal overflow at 390px, 768px, and 1440px.

## Out of scope

- A forced password change on first login, a temporary-password database flag, password expiry, password history, password-strength scoring, MFA, email recovery, or forgotten-password flows.
- Administrator password-reset behavior, login behavior, User schema changes, middleware changes, and dependency changes.
- Changes to Profile, Login, AuthContext, Axios interceptors, Sidebar, or routing.
- Database migrations, seeding, or modifying real user passwords during the OpenCode pass.
- Staging, committing, pushing, or deploying during implementation or static verification.

## Acceptance checks

- An authenticated Lecturer, Academic Manager, Executive Office user, or Super Admin can change their own password with the correct current password.
- Missing, non-object, array, unknown-field, non-string, blank, too-short, and too-long payloads produce controlled 400 responses and no write.
- An incorrect current password and reuse of the current password produce the exact controlled 400 messages and do not change the password or `tokenVersion`.
- A successful request changes the password exactly once, increments `tokenVersion` exactly once, clears legacy reset fields, and returns no credential material other than the new JWT.
- After success, the old password cannot log in, the new password can log in, the old JWT returns 401, and the returned JWT can access `/api/auth/me`.
- Two concurrent valid change requests using the same original password produce exactly one 200 and one 409; the winner's password remains stored.
- Settings performs mismatch, equality, and length validation locally without an API request.
- A successful Settings submission replaces the stored token, clears the password fields, keeps the user signed in after reload, and displays success feedback.
- A backend error remains inline and preserves the form state.
- Settings has no page-level horizontal overflow at 390px, 768px, or 1440px.

## Verification

- Run `node scripts/harness/context.mjs` before editing.
- Run `node --check backend/src/controllers/authController.js` and `node --check backend/src/routes/authRoutes.js`.
- Run `cd frontend && npm run build`.
- Run `node scripts/harness/verify-static.mjs`.
- Run `git diff --check`, `git status --short`, and inspect the complete diff for every allowed file.
- Codex performs guarded temporary-Atlas API, concurrency, security, and browser verification after the static gate.

## Delivery constraints

Do not stage, commit, push, deploy, or change any real account password. Preserve local state on failure and report the actual changed files, verification evidence, and any required file outside the allowed list.
