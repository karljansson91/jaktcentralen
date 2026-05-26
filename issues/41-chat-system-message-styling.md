# Chat System Message Styling

## Type

AFK - can start immediately once typed system messages exist.

## Fresh Session Brief

Implement this issue independently after the planning pass is complete. This issue styles existing or planned typed hunt status messages in chat.

## What to build

Style chat status/system messages differently from normal user chat bubbles. Examples include animal sighting reports, "I am in position", position-sharing status, and similar hunt activity updates. The styling should make these messages scannable without overwhelming the conversation.

## Current state

- `convex/schema.ts` already supports typed messages:
  - `text`
  - `animal_sighting`
  - `member_in_position`
  - `member_left_position`
- `convex/messages.ts` normalizes missing message type to `text` when listing messages.
- `app/(app)/event/[eventId]/chat.tsx` currently renders all message types as normal chat bubbles.
- Unread counts already count all messages from other users, regardless of type.

## Locked decisions

- First pass styles exactly these non-text message types:
  - `animal_sighting`
  - `member_in_position`
  - `member_left_position`
- Keep normal `text` messages visually unchanged.
- Unknown/future non-text message types should use a safe generic system-message fallback.
- System messages should not be centered timeline pills.
- Render system messages as simple left-aligned/inline status rows in the chat flow.
- Each system row should have an icon plus concise text.
- Use a distinct muted color treatment so status rows are visually different from normal chat bubbles without becoming loud.
- Give each known status category a subtle icon/color treatment:
  - `animal_sighting`: animal/eye/location-style icon with a warm accent.
  - `member_in_position`: check/location-style icon with a green accent.
  - `member_left_position`: exit/x/location-style icon with muted gray or amber accent.
  - fallback: info icon with muted gray treatment.
- System messages should continue to count toward unread badges exactly like normal messages.
- This issue changes presentation only, not read/unread semantics.

## Planning questions to resolve

None - decisions are locked.

## Acceptance criteria

- [ ] Typed system/status messages render differently from normal user text messages.
- [ ] Animal sighting messages have a clear status style.
- [ ] In-position messages have a clear status style.
- [ ] The style remains readable in long chats and narrow phone screens.
- [ ] Existing normal chat messages keep their current behavior.
- [ ] Unknown/future system message types have a safe fallback style.
- [ ] System messages keep existing unread-count behavior.

## Blocked by

- `24a-typed-hunt-system-messages.md` if typed message infrastructure is not already implemented.
- `19-hunt-animal-sighting-reports.md` for animal sighting message examples if not already implemented.
- `24c-hunt-in-position-status.md` for in-position message examples if not already implemented.

## Test plan

- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Verify seeded chat data with normal messages, animal sightings, in-position status, and unknown system type.
- Verify timestamp, sender, and unread behavior remain correct.
- Verify narrow phone layout and long animal/user names.

## Out of scope

- Replacing chat with a third-party chat UI.
- Adding reactions, attachments, or threads.
- Changing backend message semantics unless needed for typed rendering.
