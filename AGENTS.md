<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->

## Commit Quality Gate

Before creating any commit, always run the repo-local
`thermo-nuclear-code-quality-review` skill from
`.agents/skills/thermo-nuclear-code-quality-review/SKILL.md` against the
current branch's changes. Treat structural maintainability findings from that
review as blockers unless there is a clear, explicit reason to defer them.
