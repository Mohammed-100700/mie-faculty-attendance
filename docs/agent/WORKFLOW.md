# Agent Workflow

This workflow separates planning, implementation, and proof so expensive reasoning is used once.

## Checkpoint loop

1. Ask Codex to plan one checkpoint and write the result into `docs/agent/NEXT.md`.
2. Start a fresh OpenCode session for unrelated work, or clear stale context.
3. Run `/mie-task`. Nemotron implements only the active checkpoint and stops before staging.
4. Run `/mie-gate`. It performs static checks and reviews the actual diff.
5. Use Codex once for the checkpoint-specific runtime/browser test and final review. Fix verified defects through the same `NEXT.md` contract.
6. After all gates pass, explicitly stage only the approved paths, inspect `git diff --cached`, and commit. Never push or deploy unless separately requested.
7. Update `STATE.md`, set `NEXT.md` back to `EMPTY`, and begin a fresh session for the next checkpoint.

## Usage controls

- Keep one user-visible behavior per checkpoint.
- Store durable facts in `STATE.md`; do not repeat old chat history.
- Put exact scope, acceptance checks, and test requirements in `NEXT.md`.
- Use targeted `rg` searches and narrow reads. Avoid repository-wide rereads.
- Run deterministic scripts before asking a reviewer to reason about the change.
- Use the normal coding model for implementation and static fixes.
- Invoke the planner only for unclear architecture or cross-layer design.
- Invoke the security reviewer only for authentication, authorization, user input, secrets, uploads, database writes, or external calls.
- Invoke one code review after the build/static gate passes. Do not repeatedly review an unchanged diff.
- Run browser verification once on the final candidate unless a failure requires another pass.
- Paste concise outcomes, not full build logs, into chat.

## Gate order

1. Context/preflight
2. Implementation
3. Static verification
4. Actual diff review
5. Isolated runtime/API verification when applicable
6. Browser verification when applicable
7. Security review when risk triggers apply
8. Explicit staging and cached-diff review
9. Commit

A failed gate returns to implementation. Later gates do not erase earlier failures.
