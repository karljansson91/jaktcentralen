# Jaktcentralen

Jaktcentralen is a hunting app in the same broad space as WeHunt: it helps
hunting teams plan hunts, run the day in the field, communicate, understand the
area, and review what happened afterwards. The goal is simple: make life easier
for hunters before, during, and after the hunt.

Build for real hunting conditions:

- Keep flows obvious, calm, fast, and useful outdoors, including in rain, cold,
  low light, and spotty connectivity.
- Treat the map as a working surface, not decoration. Prefer map context when
  location, wind, boundaries, passes, or observations matter.
- Use Swedish product language by default, with hunting terms that a jaktledare
  and jaktlag would naturally use.
- Make admin actions powerful, but hard to misuse. Be especially careful with
  deleting areas, ending hunts, removing members, and changing hunt dates.
- Keep copy short and practical. Do not explain what the UI already shows.
- When in doubt, remove work from the hunting team.

## Expo

This is an Expo app. Prefer Expo and Expo Router best practices before custom
solutions: native stack screens, modal/form-sheet presentations, platform-native
controls, and Expo-supported APIs. When changing app UI, navigation, native
behavior, data fetching, deployment, or SDK configuration, use the relevant
repo-local Expo skill as guidance.

For sheets and modals, prefer Expo Router/native presentations such as
`formSheet`, content-height detents, and native grabbers. Avoid custom
React Native `Modal` sheets unless a native presentation cannot support the
interaction.

## Simulator

The iOS simulator is usually exposed through `serve-sim` at
`http://localhost:3200/`. After UI changes, use that simulator to inspect the
result in the app, verify navigation and modal behavior, and catch visual issues
before calling the work done.

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->

## Copy

When writing product copy, keep it short and simple. Do not state the obvious,
and do not say the same thing twice.

## Commit Quality Gate

Before creating any commit, always run the repo-local
`thermo-nuclear-code-quality-review` skill from
`.agents/skills/thermo-nuclear-code-quality-review/SKILL.md` against the
current branch's changes. Treat structural maintainability findings from that
review as blockers unless there is a clear, explicit reason to defer them.
