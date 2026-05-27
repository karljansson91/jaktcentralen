---
name: jaktcentralen-issues
description: Use when Codex needs to list, inspect, create, update, delete, triage, or complete Jaktcentralen's Convex-backed in-app issues, especially from production via the repo script.
---

# Jaktcentralen Issues

Use the repo script as the stable interface to production issues. It maps
`CODEX_CONVEX_KEY` to `CONVEX_DEPLOY_KEY` and calls Convex with the agent
identity expected by `convex/issues.ts`.

## Commands

Run from the repo root:

```bash
npm run issues -- list
npm run issues -- show <issueId>
npm run issues -- status <issueId> completed
npm run issues -- update <issueId> --status ongoing
npm run issues -- delete <issueId>
```

Create only when asked or when turning a clear user request into an app issue:

```bash
npm run issues -- create --title "Kort titel" --description "Vad som ska göras" --type bug
```

## Workflow

1. Read `AGENTS.md` first.
2. List issues before choosing work.
3. Move the issue to `ongoing` when starting substantial implementation.
4. Keep app-created issues in `triage` until someone intentionally changes status.
5. Mark `completed` only after implementation, simulator verification, thermo review, commit, and push.
6. Do not delete production issues unless the user asked for deletion.
