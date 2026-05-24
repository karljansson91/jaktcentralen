# Auto-End Past Hunts

## Fresh Session Brief
Implement this issue independently. Do not rely on prior chat context. This issue changes Convex event lifecycle behavior, so read `convex/_generated/ai/guidelines.md` before changing Convex code.

## Goal
Automatically treat hunts as ended when their `endDate` has passed. A hunt whose end date is already in the past should not still behave like an active hunt that the creator can manually end.

## User Story
As a hunt participant, I want a hunt to become `Avslutad` automatically after its planned end date, so hunt lists, actions, tracking, chat, and history match the actual schedule.

## Current State
- Event schema already includes `endDate` and optional `endedAt`.
- `convex/events.ts` has an `end` mutation that sets `endedAt`.
- `events.listMyEvents` filters only by `endedAt === undefined`, so a hunt with a past `endDate` can still appear as active.
- `events.listMyEndedEvents` filters only by `endedAt !== undefined`, so time-expired hunts may be missing from history.
- Some UI helpers display `Avslutad` based on `endDate < Date.now()`, creating a mismatch where a hunt can look ended but still expose `Avsluta jakt`.

## Desired Behavior
- A hunt is considered ended if either:
  - `endedAt` exists, or
  - `endDate` is in the past.
- Past-end-date hunts move out of active/upcoming lists and into ended/history lists automatically.
- Manual `Avsluta jakt` should not be offered for a hunt already ended by time.
- Live-only behavior stops after `endDate` passes:
  - live tracking updates are rejected or ignored;
  - assignment editing is disabled;
  - invites/join-by-code are blocked;
  - chat sending follows the ended-hunt policy from the hunt history issue.
- The backend should be the source of truth; do not fix this only by hiding UI buttons.

## Likely Files And APIs
- `convex/events.ts` for event lifecycle helpers, list queries, `end`, create/update scheduling, and `joinByCode` guards.
- `convex/schema.ts` only if storing an auto-end scheduled job id is necessary.
- `convex/eventMembers.ts`, `convex/positionTracking.ts`, `convex/eventPointAssignments.ts`, and `convex/messages.ts` for ended-hunt guards that currently check only `endedAt`.
- `app/(app)/event/[eventId]/actions.tsx` to hide/disable `Avsluta jakt` for time-ended hunts.
- `app/(app)/event/[eventId]/index.tsx`, `station.tsx`, `members.tsx`, and `timeline.tsx` for active versus ended UI behavior.
- `app/(app)/index.tsx` for active/history list separation.

## Data Or API Changes
- Prefer adding a shared backend helper such as `isEventEnded(event, now)` so all Convex functions use the same rule.
- Add an internal scheduled mutation/action on event creation and end-date update if Convex scheduling is appropriate:
  - schedule an auto-end at `endDate`;
  - patch `endedAt` only if the event still exists, `endedAt` is unset, and `endDate` still equals the scheduled timestamp;
  - set `endedAt` to `endDate` or the run time consistently and document the choice.
- Even with scheduling, every read/write guard should still treat `endDate <= now` as ended so missed or delayed jobs cannot expose active behavior.
- If storing scheduler ids would add complexity, use idempotent scheduled jobs keyed by `(eventId, scheduledEndDate)` instead of cancellation.

## Implementation Outline
- Introduce a single lifecycle helper for `endedAt !== undefined || endDate <= now`.
- Update active and ended list queries to use the helper.
- Update `events.get` or returned event mapping if the frontend needs a computed `isEnded`/effective ended timestamp.
- Schedule auto-end jobs from `events.create` and when `events.update` changes `endDate`.
- Make stale scheduled jobs no-op when the event end date has changed.
- Update manual `events.end` to be idempotent when the hunt has already ended by time.
- Update backend guards that block ended-hunt activity to use the effective ended check, not only `endedAt`.
- Update UI actions so already time-ended hunts show ended/history actions, not `Avsluta jakt`.

## Acceptance Criteria
- A hunt with `endDate` in the past is excluded from active/upcoming hunt lists.
- A hunt with `endDate` in the past appears in ended/history lists even if `endedAt` was never manually set.
- `Avsluta jakt` is not shown for a hunt whose `endDate` has already passed.
- Calling `events.end` on a time-ended hunt is safe and idempotent.
- Users cannot join a hunt by code after `endDate` has passed.
- Users cannot send live position updates after `endDate` has passed.
- Creator cannot edit station assignments or invite users after `endDate` has passed.
- Scheduled auto-ending works for newly created hunts and updated end dates.
- Updating a hunt's `endDate` before it ends does not allow an old scheduled job to end it early.

## Test Plan
- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Run the project's Convex codegen/check workflow if Convex functions or schema change.
- Add deterministic Convex tests with seeded events:
  - active future `endDate`;
  - past `endDate` with no `endedAt`;
  - manual `endedAt`;
  - updated `endDate` with stale scheduled auto-end input.
- Verify active and ended list queries classify each seeded event correctly.
- Verify `joinByCode`, invite, assignment edit, position tracking, and message send guards reject time-ended hunts according to product policy.
- Verify manual end is idempotent for already time-ended hunts.
- Verify the event actions UI does not render `Avsluta jakt` for a past-end-date hunt fixture.

## Dependencies
- Related lifecycle/history behavior is described in `06-hunt-ending-and-history-replay.md`.

## Out Of Scope
- Reworking the full history replay UI.
- Permanent deletion of hunts.
- Push notifications that a hunt has ended.
