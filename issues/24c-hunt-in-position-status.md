# Hunt In-Position Status

## Parent

GitHub issue #5: A couple things from the new build.

## Type

AFK - blocked by `24a-typed-hunt-system-messages.md`.

## Fresh Session Brief

Implement this issue independently. Do not rely on prior chat context. This issue changes Convex event member/assignment state, chat side effects, and active hunt map status. Read `AGENTS.md` and `convex/_generated/ai/guidelines.md` before changing Convex code.

## What to build

Let a participant mark themselves as in position at their assigned pass. The status syncs to all participants, turns that participant's assignment pin green/confirmed when effective, contributes to a readiness count, and creates typed chat messages when set or explicitly cleared.

## Locked Decisions

- Users can only mark themselves in position.
- In-position status is stored in Convex so it syncs to all participants.
- Users may mark themselves in position from anywhere.
- Effective confirmed display uses a 75 meter assignment radius when location is available.
- If a marked user remains more than 75m away for 60 seconds, notify only that user and ask whether to clear status.
- If an assigned user is within 20m for 60 seconds and has not marked in position, prompt only that user to mark themselves in position.
- Marking in position creates a typed `member_in_position` chat message.
- Explicitly clearing in-position creates a typed `member_left_position` chat message.
- Automatic moved-away detection does not post to chat.
- Ended hunts do not show/use live in-position controls.
- Every participant's assignment pin turns green/confirmed when that participant is effectively in position.
- Readiness count includes only participants with assigned passes.
- Users with position sharing disabled still count if they explicitly marked themselves in position.
- No creator/admin reset action in this issue.

## Acceptance criteria

- [ ] An accepted participant with an assigned pass can mark themselves in position.
- [ ] Other participants see that assignment pin as confirmed/green when the status is effective.
- [ ] The current user's live marker is hidden while they are effectively confirmed at their assigned pass.
- [ ] If the user moves beyond 75m for 60 seconds, only that user is prompted to clear the status.
- [ ] If the user is within 20m for 60 seconds without being marked in position, only that user is prompted to mark in position.
- [ ] Marking in position creates a `member_in_position` typed chat message.
- [ ] Explicitly clearing status creates a `member_left_position` typed chat message.
- [ ] Readiness count near the hunt title/top nav shows assigned participants in position, for example `3/5 på plats`.
- [ ] Users without an assigned pass are excluded from the readiness count.
- [ ] Ended hunts do not expose in-position controls.

## Blocked by

- `24a-typed-hunt-system-messages.md`

## Test plan

- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Run the project's Convex codegen/check workflow.
- Add deterministic Convex tests for setting/clearing own in-position state, rejecting attempts to set another user's status, and creating typed chat messages.
- Add deterministic tests for readiness count derivation with assigned/unassigned users.
- Use fake coordinates/timers for the 75m/60s moved-away and 20m/60s near-pass prompts.
- Verify the map/top-nav UI in simulator or `localhost:3200` with seeded assigned participants.
- Run the repo-local thermo-nuclear code quality review before committing implementation changes.

## Out of scope

- Creator/admin reset-all readiness.
- Drive/såtar-specific readiness.
- Push notifications.
