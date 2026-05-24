# Chat Unread Indicator

## Fresh Session Brief
Implement this issue independently. Do not rely on prior chat context. This issue changes Convex message/read-state behavior, so read `convex/_generated/ai/guidelines.md` before changing Convex code.

## Goal
Show an unread message indicator with a count when other participants have sent chat messages that the current user has not viewed.

## User Story
As a hunt participant on the map, I want to see how many unread chat messages exist before I open chat, so I know when the hunt chat needs my attention.

## Current State
- Chat route: `app/(app)/event/[eventId]/chat.tsx`.
- Hunt map chat button: `app/(app)/event/[eventId]/index.tsx`.
- Messages table stores `eventId`, `userId`, and `body`.
- Messages are paginated by `api.messages.list`.
- There is no read receipt/read cursor state.
- The map chat button has no unread badge/count.

## Desired Behavior
- Track, per event and per user, the last point in chat the user has viewed.
- Show an unread count on the event map chat button when unread messages exist.
- Unread count includes messages from other users only.
- The current user's own sent messages should not increase their unread count.
- Opening/viewing the chat marks currently visible/latest messages as read.
- Sending a message should leave the sender with zero unread messages for that message.
- Badge should disappear once the user has opened chat and the latest messages are marked read.
- Badge display should cap gracefully, for example `99+`, so the button stays polished.

## Likely Files And APIs
- `convex/schema.ts` for read-state storage, either:
  - add fields such as `lastReadMessageAt`/`lastReadAt` to `eventMembers`, or
  - add a dedicated `messageReads` table keyed by `eventId` and `userId`.
- `convex/messages.ts` for unread count query and mark-read mutation.
- `app/(app)/event/[eventId]/index.tsx` for the chat button badge.
- `app/(app)/event/[eventId]/chat.tsx` for marking messages read when chat is viewed.
- Optional home surface: `app/(app)/index.tsx` if unread chat count should also appear on hunt list rows later.

## Data Or API Changes
- Recommended model: store a per-member read cursor on `eventMembers` to avoid a new table unless the implementation needs richer receipts.
- Use a stable numeric cursor such as latest message `_creationTime` read by that user.
- Add `messages.getUnreadCount` or include unread count in an event summary query.
- Add `messages.markRead` mutation that:
  - verifies the caller is an accepted member;
  - finds the latest message for the event or accepts a validated latest timestamp;
  - updates the caller's read cursor;
  - never marks another user's state.
- Ensure unread count excludes messages where `message.userId === currentUser._id`.
- Respect ended-hunt access rules: ended chat can still be read and marked read even if sending is disabled.

## Implementation Outline
- Add read cursor storage and indexes needed for efficient unread counting.
- Add a query that returns the current user's unread count for an event.
- Add a mutation to mark the chat read up to the latest loaded/latest known message.
- Subscribe to unread count on the event map screen.
- Render a small badge on the floating chat button with the unread count.
- In the chat screen, call mark-read when:
  - the first page of messages has loaded;
  - new messages arrive while the user is already viewing chat;
  - the user sends a message successfully.
- Avoid marking read before the user actually opens the chat screen.
- Keep badge layout stable so the chat icon/button does not resize or jump.

## Acceptance Criteria
- When another participant sends one message while the user has not opened chat, the chat button shows `1`.
- When multiple other-user messages arrive, the badge shows the correct count.
- Messages sent by the current user do not count as unread for that same user.
- Opening chat clears the unread badge after messages are marked read.
- New messages arriving while the chat screen is open do not leave a stale unread badge.
- Unread state is per user and per hunt; reading one hunt chat does not clear another hunt's unread count.
- Badge count caps gracefully for large counts.
- Ended hunt chat can still be marked read.

## Test Plan
- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Run the project's Convex codegen/check workflow if Convex schema/functions change.
- Add deterministic Convex tests with seeded event, current user, another participant, and messages.
- Verify unread count is `0` before any other-user messages.
- Verify unread count increments for other-user messages.
- Verify unread count ignores current-user messages.
- Verify `markRead` clears the count for the caller only.
- Verify another participant's unread state is unaffected by the caller marking read.
- Verify ended-hunt messages can be marked read.
- Render or inspect the event map chat button with unread counts `0`, `1`, `9`, and `100` to verify badge visibility and cap behavior.

## Dependencies
- Chat keyboard/composer behavior is covered separately in `11-chat-keyboard-composer.md`.
- Ended-hunt read-only chat behavior is covered in `06-hunt-ending-and-history-replay.md` and `17-auto-end-past-hunts.md`.

## Out Of Scope
- Push notifications for unread messages.
- Per-message read receipts visible to other participants.
- Mentions, reactions, typing indicators, or chat previews.
- Home-level aggregate unread badges unless intentionally added after the map chat badge works.
