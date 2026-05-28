---
name: implement-issues
description: Implement all Jaktcentralen Convex-backed issues that are ready_to_implement in unattended mode, one by one, including dependency review, simulator verification, thermo review, push, and marking issues completed.
---

# Implement Issues

Use this skill when the user wants Codex to keep implementing Jaktcentralen
issues from the in-app Convex issue tracker until no `ready_to_implement`
issues remain.

## Unattended Mode

Assume the user is away from the computer. Do not stop to ask questions. If
there is a reasonable product or implementation choice, choose the best solution
for Jaktcentralen and continue.

Only punt an issue when the requirement is genuinely ambiguous, blocked by
missing credentials/services, or conflicts with another issue. In that case:

1. Move the issue back to `triage`.
2. Add a short blocker note explaining why.
3. Continue with the next `ready_to_implement` issue.

The issue script does not currently have a separate comment command. If comments
are unavailable, add the blocker note by updating the issue description.

## Required Skills

Read these before starting:

1. `AGENTS.md`
2. `.agents/skills/jaktcentralen-issues/SKILL.md`
3. `.agents/skills/thermo-nuclear-code-quality-review/SKILL.md`

If any implementation touches Convex, read
`convex/_generated/ai/guidelines.md` before editing Convex code.

## Step 1: Dependency Review

1. List current issues:

   ```bash
   npm run issues -- list
   ```

   The issues command loads `CODEX_CONVEX_KEY` or `CONVEX_DEPLOY_KEY` from the
   shell, `.env.local`, or `.env`; do not prefix the command with a manual
   `source .env` unless debugging the environment itself.

2. Select all `ready_to_implement` issues.
3. Inspect titles/descriptions for dependencies, duplicates, and overlap.
4. Write down the intended order before coding.
5. If issues should be merged, split, deleted, or clarified, do it through the
   issue script and explain the change briefly.
6. Prefer the order that removes blockers first and keeps each implementation
   small enough to verify independently.

Do not start coding until the first issue and its dependency assumptions are
clear, but do not wait for user confirmation.

## Step 2: Implement One Issue

For the next issue in order:

Finish the full cycle for one issue before starting the next one. That means
verify, run thermo review, fix blockers, commit, push, and mark completed after
each issue. Prefer one commit per issue unless issues were intentionally merged
during dependency review.

1. Move it to `ongoing`:

   ```bash
   npm run issues -- status <issueId> ongoing
   ```

2. Inspect the relevant code and existing patterns.
3. Implement the smallest complete fix or feature that satisfies the issue.
4. Keep the codebase tidy:
   - Follow Expo Router and Expo best practices for app UI and navigation.
   - Keep Swedish copy short and practical.
   - Avoid unrelated refactors.
   - Do not revert unrelated local changes.
5. Verify locally:
   - Run focused checks first.
   - Run `npx tsc --noEmit` before the issue is considered done.
   - Use the simulator at `http://localhost:3200/` for UI/navigation changes.
6. Run `.agents/skills/thermo-nuclear-code-quality-review/SKILL.md` against the
   current branch changes.
7. Fix all structural maintainability blockers from the review.
8. Re-run the checks that cover the fix.
9. Commit the issue changes.
10. Push to production/master.
11. Mark the issue completed only after push succeeds:

    ```bash
    npm run issues -- status <issueId> completed
    ```

## Step 3: Repeat

After each completed issue:

1. List issues again.
2. Re-check dependencies because the previous fix may have made another issue
   obsolete or changed the best order.
3. Continue with the next `ready_to_implement` issue.
4. Stop only when no `ready_to_implement` issues remain, or when every remaining
   issue is blocked.

## Completion Report

When done, report:

- Issues completed and pushed.
- Issues merged, deleted, split, or left blocked.
- Verification run.
- Current commit/push status.
