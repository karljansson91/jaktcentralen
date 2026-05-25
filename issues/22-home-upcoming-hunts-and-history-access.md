# Home Hunt List And Ended History Toggle

## Parent

GitHub issue #5: A couple things from the new build.

## Type

AFK - can start immediately.

## Fresh Session Brief

Implement this issue independently. Do not rely on prior chat context. This issue is a home-screen product/UI slice. If Convex code is touched, read `AGENTS.md` and `convex/_generated/ai/guidelines.md` first.

## What to build

Keep all hunt events under the home screen's `Mina jakter` area, but make the default view focus on current and future hunts. Ended hunts should remain accessible under a small `Avslutade` disclosure that is collapsed by default and opens with a snappy animation.

## Locked Decisions

- Keep the main section title `Mina jakter`.
- The default visible list contains ongoing and upcoming hunts only.
- Ongoing is date-based: a hunt is ongoing when `startDate <= now <= endDate`.
- Sort ongoing hunts first, then upcoming hunts.
- Ongoing cards should have a clear green active marker such as `Pågår`.
- Upcoming cards should emphasize the hunt start date.
- Do not add separate `Pågående` or `Kommande` subtitles.
- Ended hunts move under a small `Avslutade` subtitle/disclosure inside `Mina jakter`.
- `Avslutade` is collapsed by default each time the home screen mounts.
- Opening/closing `Avslutade` should use a short, polished animation.

## Acceptance criteria

- [ ] `Mina jakter` still exists as the home hunt section.
- [ ] Ongoing and upcoming hunts are visible by default.
- [ ] Ended hunts are not mixed into the default visible hunt list.
- [ ] Ongoing hunts are identified from dates and render before upcoming hunts.
- [ ] Ongoing hunt cards show a clear active badge/marker.
- [ ] Upcoming hunt cards show the start date more prominently than the end date.
- [ ] Ended hunts are accessible under an `Avslutade` toggle/disclosure.
- [ ] The `Avslutade` area is collapsed by default on each home screen mount.
- [ ] Expanding/collapsing ended hunts feels snappy and does not cause text overlap or layout jumps.
- [ ] Existing navigation to active, upcoming, and ended hunt details continues to work.

## Blocked by

None - can start immediately.

## Test plan

- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Use deterministic fixture/query states with no hunts, only upcoming hunts, ongoing plus upcoming hunts, ended-only hunts, and mixed ongoing/upcoming/ended hunts.
- Verify ongoing classification at the date boundary: before start, on/after start, and after end.
- Verify sort order: ongoing first, then upcoming by start date.
- Verify `Avslutade` starts collapsed and opens/closes with animation.
- Verify narrow phone and larger viewport layouts have no overlapping text or clipped badges.
- Verify pressing every rendered hunt still opens the correct event route.
- Run the repo-local thermo-nuclear code quality review before committing implementation changes.

## Out of scope

- A separate full history/replay redesign.
- Changing event lifecycle semantics beyond using the existing date-based lifecycle.
- Persisting the `Avslutade` expanded/collapsed state between app launches.
