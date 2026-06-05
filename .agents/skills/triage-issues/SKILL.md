---
name: triage-issues
description: Triage Jaktcentralen's Convex-backed issues by listing rough issues, using the grill-me questioning loop to clarify each one, updating issue descriptions into implementable specs, and promoting locked issues to ready_to_implement. Use when the user asks for /triage-issues, /triage issues, to triage app issues, to grill issues, or to make issues ready for implementation/release.
---

# Triage Issues

Use this skill to turn rough app-created issues into implementation-ready issues.

## Required Skills

Read these before starting:

1. `AGENTS.md`
2. `.agents/skills/jaktcentralen-issues/SKILL.md`
3. `.agents/skills/grill-me/SKILL.md`

## Status Model

The issue tracker currently supports `triage`, `ready_to_implement`, `ongoing`,
and `completed`. When the user says "ready to release" in this workflow, promote
clarified issues to `ready_to_implement` unless the tracker schema has gained a
more specific release-ready status.

## Workflow

1. List issues:

   ```bash
   npm run issues -- list
   ```

2. Select issues to triage.
   - By default, triage only issues with status `triage`.
   - If the user explicitly says "all issues", include every non-`completed`
     issue, but do not move `ongoing` or already `ready_to_implement` issues
     backward unless their spec is clearly wrong.
   - Skip `completed` issues unless the user explicitly asks to reopen them.

3. Do a dependency and duplicate pass before questioning.
   - Look for duplicate reports, dependent issues, and obvious overlaps.
   - If a question can be answered by reading the codebase, inspect the code
     instead of asking the user.
   - Do not delete issues unless the user explicitly asks for deletion.

4. Grill one issue at a time.
   - Follow `.agents/skills/grill-me/SKILL.md`: ask one question at a time and
     provide the recommended answer with each question.
   - Keep going until the issue has a locked target behavior, scope boundary,
     acceptance criteria, and any simulator or data verification needs.
   - If the user accepts the recommended answer, record that decision and move to
     the next unresolved branch.

5. Update the issue once it is clear.
   - Rewrite the description into this shape:

     ```markdown
     ## What to build
     [Concrete target behavior.]

     ## Acceptance criteria
     - [ ] [Observable requirement]
     - [ ] [Verification requirement]

     ## Blocked by
     None - can start immediately.
     ```

   - Keep user-facing product copy Swedish when the issue specifies copy.
   - Keep implementation language direct and practical.
   - Then promote the issue:

     ```bash
     npm run issues -- update <issueId> --title "..." --description "..." --status ready_to_implement
     ```

6. Leave blocked issues in `triage`.
   - If a requirement is genuinely ambiguous after grilling, conflicts with
     another issue, or requires missing credentials/services, update the
     description with a short blocker note and keep status `triage`.

7. Repeat until no selected issues remain.

## Completion Report

Report:

- Issues promoted to `ready_to_implement`.
- Issues left in `triage` and why.
- Issues merged, skipped, or identified as duplicates.
- Commands run.
