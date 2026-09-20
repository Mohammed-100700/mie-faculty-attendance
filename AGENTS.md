# MIE Attendance Agent Contract

## Read order

OpenCode automatically receives this file and `docs/agent/STATE.md`. Do not scan the repository or read every document at startup. For implementation, read `docs/agent/NEXT.md` and only the source files needed for that checkpoint. Read `docs/agent/WORKFLOW.md` when executing or verifying a checkpoint.

## Application

MIE Faculty Class Attendance & Salary Tracker is a React 18/Vite frontend with a Node/Express/Mongoose backend. Authentication uses JWT. Roles are lecturer, academic manager, and executive office. Preserve current role and ownership rules.

## Non-negotiable rules

- Never print, expose, commit, or overwrite `.env` values or credentials.
- Never use an existing or production database for tests. Runtime tests must use a newly named temporary database, verify the guard, and drop it afterward.
- Do not seed, migrate, delete, or rewrite user data without explicit approval.
- Do not update dependencies unless the checkpoint requires it.
- Inspect existing patterns before adding APIs, models, utilities, or components.
- Keep changes limited to the files allowed by `docs/agent/NEXT.md`. Stop and report if another file is required.
- Preserve backward compatibility unless the active checkpoint explicitly changes it.
- Do not stage, commit, push, or deploy during implementation or verification.
- When staging is later approved, list each path explicitly. Never use `git add .` or `git add -A`.

## Working method

1. Run `node scripts/harness/context.mjs`.
2. Read the active checkpoint in `docs/agent/NEXT.md`.
3. Inspect targeted code with `rg` and narrow file reads.
4. Implement the smallest change that satisfies the acceptance checks.
5. Run `node scripts/harness/verify-static.mjs`.
6. Inspect the actual diff. Do not rely on summaries.
7. Report evidence, remaining runtime checks, and blockers.

Use the configured Nemotron model for routine implementation. Use planner, reviewer, or security agents only when the checkpoint calls for them. Do not create parallel agents for a small sequential change.

## Source of truth

- Current product and checkpoint state: `docs/agent/STATE.md`
- Active task contract: `docs/agent/NEXT.md`
- Gate sequence and model usage: `docs/agent/WORKFLOW.md`
- Reusable task format: `docs/agent/TASK_TEMPLATE.md`

Code and executable checks override stale prose. If documentation disagrees with source, report the mismatch and fix the documentation as part of an approved checkpoint.
