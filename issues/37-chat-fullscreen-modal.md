# Chat Fullscreen Modal

## Type

AFK - can start immediately.

## Fresh Session Brief

Implement this issue independently after the planning pass is complete. This issue changes event chat presentation and should preserve existing chat data behavior.

## What to build

Present event chat as a full-screen modal instead of a half-screen sheet. The chat should have a clear close button in a polished header using the app's existing Expo/glass header primitives where appropriate.

## Current state

- `app/(app)/event/[eventId]/_layout.tsx` presents `chat` as a `formSheet` with detents `[0.5, 0.72, 0.94]`, a grabber, and no header.
- `app/(app)/event/[eventId]/chat.tsx` already uses `react-native-keyboard-controller` chat primitives for the scroll/composer behavior.
- `components/glass/glass-top-nav.tsx` exports `GlassScreenHeader` and `GlassTopNav` patterns for app-styled glass headers.

## Locked decisions

- Chat should be full-screen on all supported devices/platforms.
- Remove chat sheet detents, grabber, and half-screen presentation behavior.
- Keep chat as a modal route rather than converting it into a normal pushed screen.
- Use `fullScreenModal` or the closest Expo Router/React Navigation presentation that gives a true full-screen modal.
- The close button should dismiss the modal with router back/dismiss behavior.
- If there is no route to go back to, fall back to the event map route for the same `eventId`.
- Use an `X` close icon rather than a back chevron.
- Prefer Expo Router/React Navigation default modal behavior and header semantics where they fit.
- Do not invent a custom header system for chat.
- Use the app's existing Expo/glass header primitives for the visible glass header treatment.
- The chat header should show title `Chat` and a visible `X` close button.

## Planning questions to resolve

None - decisions are locked.

## Acceptance criteria

- [ ] Opening chat presents a full-screen experience instead of a half-screen sheet/detent.
- [ ] Chat includes a visible close button.
- [ ] The close button returns the user to the expected hunt context.
- [ ] The header/title treatment matches existing glass navigation styling.
- [ ] The implementation uses Expo Router/React Navigation modal defaults where possible and existing app glass header primitives for custom visual treatment.
- [ ] Keyboard and composer behavior remains usable in the full-screen presentation.
- [ ] Existing message send/list behavior remains unchanged.

## Blocked by

None - can start immediately.

## Test plan

- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Verify opening and closing chat from an active hunt.
- Verify keyboard open/close behavior in full-screen chat.
- Verify unread/read behavior if chat unread tracking is present.
- Verify iOS and Android modal behavior if both are available.

## Out of scope

- Replacing the chat backend.
- Adding attachments, reactions, or message search.
- Redesigning non-chat event screens.
