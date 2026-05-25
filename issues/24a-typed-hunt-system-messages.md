# Typed Hunt System Messages

## Parent

GitHub issue #5: A couple things from the new build.

## Type

AFK - can start immediately.

## Fresh Session Brief

Implement this issue independently. Do not rely on prior chat context. This issue changes Convex message data and existing animal sighting chat behavior, so read `AGENTS.md` and `convex/_generated/ai/guidelines.md` before changing Convex code.

## What to build

Add typed hunt chat messages so normal chat, animal sightings, and future position-status events can be rendered and filtered without parsing Swedish body text. Refactor animal sighting-generated messages onto this typed-message foundation while keeping a fallback body string for display.

## Locked Decisions

- Introduce message types:
  - `text`
  - `animal_sighting`
  - `member_in_position`
  - `member_left_position`
- Keep `body` as fallback display text for all message types.
- Add lightweight metadata for system messages:
  - `animal_sighting` links to `sightingId`
  - `member_in_position` links to `targetKey`
  - `member_left_position` links to `targetKey`
- Refactor animal sightings to create `animal_sighting` messages instead of plain untyped text messages.

## Acceptance criteria

- [ ] Normal user-sent chat messages are stored as type `text`.
- [ ] Animal sighting reports create type `animal_sighting` messages linked to the created sighting.
- [ ] Existing chat rendering still displays all message bodies correctly.
- [ ] Message list queries return type and metadata needed for future filtering/rendering.
- [ ] Unread counts still include typed system messages from other users and exclude the current user's own generated messages.
- [ ] Ended hunt chat remains readable with typed messages.

## Blocked by

None - can start immediately.

## Test plan

- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Run the project's Convex codegen/check workflow.
- Add deterministic Convex tests for sending normal text, creating animal sightings, message type/metadata creation, and unread count behavior.
- Verify chat UI renders seeded text and animal-sighting typed messages without regressions.
- Run the repo-local thermo-nuclear code quality review before committing implementation changes.

## Out of scope

- Adding filtering UI.
- New in-position mutations or UI; those are covered by follow-up slices.
- Backfilling historical production messages unless required by schema compatibility.
