# Hunt Ending And History Replay

## Fresh Session Brief
Implement this issue independently. Do not rely on prior chat context. This issue changes Convex event lifecycle behavior, so read `convex/_generated/ai/guidelines.md` before changing schema/functions.

## Goal
Archive ended hunts instead of deleting them, and allow users to review hunt history with map replay and chat.

## User Story
As a hunt creator, I want to end a hunt without deleting it. As a participant, I want to review the hunt afterward, including movement and chat.

## Current State
- Current destructive remove behavior deletes event data, members, trails, and messages.
- `positionTrails` table and read APIs exist.
- Live tracking currently updates latest position rather than consistently recording replayable history.
- There is no history/replay UI.
- Home only lists current accepted events through `events.listMyEvents`.

## Desired Behavior
- Ending a hunt archives it instead of deleting it.
- Archived hunts remain viewable by participants who had access.
- Active/upcoming hunts remain in `Mina jakter`.
- Ended hunts appear in a separate home `Historik` section.
- Opening an ended hunt shows a history-oriented experience.
- History view includes area boundary, participant movement over time, time replay control, positions at selected time, and readable chat.
- Live tracking stops or becomes read-only after the hunt is ended.

## Likely Files And APIs
- `convex/schema.ts` for event lifecycle fields.
- `convex/events.ts` for `end/archive`, list active hunts, and list ended hunts.
- `convex/eventMembers.ts` for blocking live position updates after end.
- `convex/messages.ts` for deciding whether ended-hunt chat is read-only.
- `convex/positionTrails.ts` for replay data reads.
- `app/(app)/index.tsx` for `Historik`.
- `app/(app)/event/[eventId]/index.tsx` for active versus ended map behavior.
- `app/(app)/event/[eventId]/chat.tsx` for read-only ended chat behavior.

## Data Or API Changes
- Add optional `endedAt: number` to `events`.
- Do not add `endedByUserId`; ending is creator-only, so `creatorId` is enough context for now.
- `endDate` is required for every hunt, same as `startDate`.
- Treat an event as ended when `endedAt` exists.
- Add `events.end` mutation that only the creator can call.
- Preserve `events.remove` only as a separate permanent delete action if still needed.
- Add or update queries so home can separately load active/upcoming hunts and ended hunts.
- Block live position writes after `endedAt` is set.
- Chat for ended hunts should be readable; decide in implementation whether sending is disabled. Default: disable sending after end.

## Implementation Outline
- Add lifecycle fields to schema.
- Update event queries so active and ended hunts are separated.
- Replace normal `Avsluta jakt` behavior with `events.end`.
- Keep messages, members, and trails when ending.
- Add `Historik` section to home that opens ended hunts.
- Add ended-hunt display mode for event screen.
- Build a basic replay map with time selection from available `positionTrails`.
- Keep chat readable for ended hunts.

## Acceptance Criteria
- Creator can end/archive a hunt.
- Ending a hunt does not delete messages, participants, or position trails.
- Ended hunts move out of the active hunt list and into `Historik`.
- Participants can open an ended hunt from history.
- History map can show movement over time when trail data exists.
- Chat remains readable for ended hunts.
- Users cannot send normal live hunt updates after a hunt is ended.
- Non-creators cannot end/archive a hunt.
- Permanent delete, if retained, is not the default end-hunt action.

## Test Plan
- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- If Convex schema/functions changed, run the project's Convex codegen/check workflow.
- Add or extend deterministic Convex tests for event archive/end behavior using seeded creator, participant, messages, and position trails.
- Verify ending a hunt as creator sets lifecycle fields and does not delete the event.
- Verify ending a hunt preserves seeded members, messages, and position trails.
- Verify ended hunts are returned by the history query and excluded from active/current query.
- Verify non-creators cannot end/archive a hunt.
- Verify position writes are rejected or ignored after a hunt is ended.
- Verify message sending is disabled after end if read-only chat is implemented.
- Use fixture trail data to verify replay data transformation/select-at-time behavior without real GPS movement.
- If UI is changed, render or inspect home/history/event screens using seeded ended-hunt data without manual account creation.

## Dependencies
- Reliable trail recording is specified in `08-live-background-tracking.md`.
- Hunt creator actions are specified in `05-hunt-info-and-actions.md`.

## Out Of Scope
- Advanced statistics beyond movement and chat.
- Exporting hunt history.
- Push notifications for ended hunts.
