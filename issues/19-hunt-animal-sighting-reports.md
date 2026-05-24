# Hunt Animal Sighting Reports

## Fresh Session Brief
Implement this issue independently. Do not rely on prior chat context. This issue changes Convex hunt data, chat behavior, live map UI, and history replay, so read `convex/_generated/ai/guidelines.md` before changing Convex code.

## Goal
Let hunt participants long-press the hunt map to report an animal sighting, share it into chat, show it as a temporary live map marker, and preserve it for later history replay.

## User Story
As a hunter during an active hunt, I want to long-press the map and quickly pick what animal I saw, so everyone is notified in chat and can see the sighting location on the map until they acknowledge it.

## Current State
- Active hunt map route: `app/(app)/event/[eventId]/index.tsx`.
- History replay route: `app/(app)/event/[eventId]/timeline.tsx`.
- Chat route: `app/(app)/event/[eventId]/chat.tsx`.
- Messages currently store `eventId`, `userId`, and `body`.
- The hunt map has marker taps for area features/stations, but no long-press sighting flow.
- History replay currently plans to show area boundary, participant movement, and chat, but not animal sightings.

## Desired Behavior
- During an active hunt, a participant can long-press the map to open a compact animal picker.
- The picker includes common Swedish hunt animals, for example:
  - `Älg`
  - `Rådjur`
  - `Vildsvin`
  - `Kronhjort`
  - `Dovhjort`
  - `Räv`
  - `Annat`
- Selecting an animal creates a sighting at the pressed coordinate.
- The sighting is sent to chat as a clear system/report message, including animal type, reporter name, and time.
- The sighting appears on the live hunt map as a marker.
- Participants can acknowledge the sighting to hide it from their own live map.
- Acknowledging does not delete the sighting and does not hide it for other users who have not acknowledged it.
- Sightings remain visible in history replay at the time/place they happened, even if they were acknowledged during the live hunt.

## Likely Files And APIs
- `convex/schema.ts` for sighting and acknowledgement tables, and possibly message type fields.
- New `convex/eventSightings.ts` or equivalent for create/list/acknowledge APIs.
- `convex/messages.ts` if chat needs system/report message support or a linked message type.
- `app/(app)/event/[eventId]/index.tsx` for map long-press, picker UI, live sighting markers, and acknowledge action.
- `app/(app)/event/[eventId]/chat.tsx` for rendering sighting/system messages if message schema changes.
- `app/(app)/event/[eventId]/timeline.tsx` for replaying sighting markers.
- Optional shared animal constants in `lib/` if both frontend and backend need the same animal type list.

## Data Or API Changes
- Add a hunt-specific sighting table. Recommended fields:
  - `eventId`
  - `reporterUserId`
  - `animalType`
  - `latitude`
  - `longitude`
  - `reportedAt`
  - optional `messageId` if a linked chat message is created.
- Add a per-user acknowledgement table. Recommended fields:
  - `eventId`
  - `sightingId`
  - `userId`
  - `acknowledgedAt`
- Add indexes for:
  - sightings by `eventId` and `reportedAt`;
  - acknowledgements by `sightingId` and `userId`;
  - acknowledgements by `eventId` and `userId`.
- Use one backend mutation to create both the sighting and its chat message so the map and chat cannot drift apart.
- If extending messages, support a system/report message type such as `animal_sighting` while preserving existing text messages.
- Sightings should be creatable only by accepted members of an active hunt.
- Acknowledgements should be allowed only for accepted members of that hunt.
- Ended hunts should not accept new sightings, but their sightings should remain readable.

## Implementation Outline
- Define the animal type list and labels in one place.
- Add Convex schema/functions for creating, listing, and acknowledging sightings.
- Update the active event map to capture long-press coordinates without interfering with existing point marker taps.
- Show a compact option sheet/popover for animal selection.
- On selection, call the create-sighting mutation and optimistically or reactively show the marker.
- Render unacknowledged live sightings as distinct markers on the hunt map.
- Provide an acknowledge affordance from the marker detail or a small action near the marker.
- Insert/render a chat message for the sighting so participants who are not looking at the map still see it.
- Update unread chat logic, if implemented, so sighting messages count as unread for other participants but not for the reporter.
- Update history replay to include sighting markers at their `reportedAt` timestamp.

## Acceptance Criteria
- Long-pressing the active hunt map opens an animal picker.
- Selecting an animal creates a sighting tied to the pressed coordinate.
- The created sighting appears in chat with animal, reporter, and time.
- The created sighting appears as a marker on the live hunt map for participants.
- The reporter does not need to manually send a separate chat message.
- Each participant can acknowledge the sighting.
- Acknowledging hides the live marker for that participant only.
- Acknowledged sightings are still visible in history replay.
- Non-members cannot create or acknowledge sightings.
- Invited/declined/non-accepted members cannot create sightings.
- New sightings cannot be created after the hunt is ended by `endedAt` or past `endDate`.
- Existing sighting markers and chat messages remain readable after the hunt ends.

## Test Plan
- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Run the project's Convex codegen/check workflow if Convex schema/functions change.
- Add deterministic Convex tests with seeded active event, ended event, accepted participant, invited participant, and multiple messages/sightings.
- Verify accepted participant can create a sighting and that a linked chat message is created.
- Verify non-member and invited member create attempts are rejected.
- Verify create attempts are rejected for ended/time-ended hunts.
- Verify list query returns sightings with reporter details and caller-specific acknowledgement state.
- Verify acknowledging a sighting hides it for the caller but not for another participant.
- Verify acknowledged sightings remain returned by the replay/history query.
- Use map UI fixtures to verify long-press opens the picker and selected animal creates a marker.
- Use chat UI fixtures to verify sighting messages render distinctly from normal user text.

## Dependencies
- Ended hunt lifecycle is covered by `06-hunt-ending-and-history-replay.md` and `17-auto-end-past-hunts.md`.
- Chat unread behavior is covered by `18-chat-unread-indicator.md`.
- History replay map behavior is covered by `06-hunt-ending-and-history-replay.md`.

## Out Of Scope
- Push notifications for sightings.
- Photos or evidence attached to a sighting.
- Editing or deleting a sighting after report.
- Species-specific statistics, harvest logs, or official reporting.
- Global/shared area animal markers outside the specific hunt.
