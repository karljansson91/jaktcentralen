# Chat Keyboard Composer

## Fresh Session Brief
Implement this issue independently. Do not rely on prior chat context. This issue changes chat keyboard behavior and may add a native dependency, so use Expo-compatible installation commands and run the native dependency checks.

## Goal
Fix the event chat keyboard behavior using a proven keyboard package and a chat-style composer pattern inspired by `EvanBacon/chat-template`, not a hand-rolled keyboard workaround.

## User Story
As a hunt participant using chat, I want the message composer and send button to stay just above the keyboard with smooth scrolling, so I can type and send without the input being hidden or jumping around.

## Current State
- Main route: `app/(app)/event/[eventId]/chat.tsx`.
- Route presentation: `app/(app)/event/[eventId]/_layout.tsx`.
- The screen currently uses React Native `KeyboardAvoidingView`.
- The composer is placed after a `ScrollView` inside the same screen.
- The keyboard behavior is reported broken.
- The current multiline input may show a keyboard return/enter affordance instead of a clear send affordance.

## Desired Behavior
- Use `react-native-keyboard-controller` or an equivalent Expo-supported package with a clear reason if the current package is unsuitable.
- Prefer the pattern used by chat-focused keyboard primitives:
  - chat scroll area handles keyboard movement and interactive dismissal;
  - composer/send row is sticky above the keyboard;
  - safe-area bottom inset is included without double-padding;
  - taps on send work while the keyboard is open.
- The send button remains visible above the chat content and keyboard.
- The keyboard action visually reads as send, not enter, where the platform supports it.
- Multiline typing still works if the app wants multiline chat input, but sending must have an obvious dedicated send control.
- New messages auto-scroll to the end without fighting the user when they are reading older messages.

## Reference Material
- User-requested implementation inspiration: [EvanBacon/chat-template](https://github.com/EvanBacon/chat-template).
- Expo's current `react-native-keyboard-controller` docs list it as Expo Go compatible and installable with `npx expo install react-native-keyboard-controller`.
- Keyboard Controller's `KeyboardChatScrollView` is purpose-built for chat layouts and handles keyboard appearance, interactive dismissal, and content repositioning.

## Likely Files And APIs
- `package.json` and `package-lock.json` if adding `react-native-keyboard-controller`.
- App root layout if `KeyboardProvider` must be installed near the root.
- `app/(app)/event/[eventId]/chat.tsx` for the chat list and composer.
- `app/(app)/event/[eventId]/_layout.tsx` for sheet detents/presentation that may interact with keyboard behavior.
- `api.messages.list` and `api.messages.send` should not need API changes.

## Data Or API Changes
- No Convex schema changes expected.
- No message API changes expected.

## Implementation Outline
- Install the Expo-compatible keyboard package with `npx expo install react-native-keyboard-controller`.
- Add the required provider/configuration following the package docs.
- Replace the current `KeyboardAvoidingView` chat layout with keyboard-controller primitives such as `KeyboardChatScrollView` plus `KeyboardStickyView`, or a documented equivalent from the same package.
- Keep the composer visually aligned with the app's existing chat design.
- Keep `keyboardShouldPersistTaps="handled"` and enable interactive dismissal where supported.
- Ensure send remains a Pressable/IconButton outside the text input and works while focused.
- Use `returnKeyType="send"` or platform-appropriate input props, but avoid breaking multiline composition.
- Avoid negative offsets, hard-coded keyboard heights, or manual keyboard event hacks.

## Acceptance Criteria
- Chat composer stays visible above the keyboard on iOS.
- Chat composer stays visible above the keyboard on Android.
- The message list remains scrollable while the keyboard is open.
- Send button can be tapped without dismissing the keyboard first.
- New outgoing messages appear and the list scrolls to the newest message when the user is already at the end.
- Loading older messages does not jump the composer or obscure the list.
- Keyboard action/arrow reads as send where supported, and the visible app send button uses a send icon.
- No random custom keyboard spacer logic or fixed keyboard-height constants are introduced.

## Test Plan
- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Run `npx expo-doctor@latest` because this issue may add a native package.
- If dependencies change, run the app's relevant native rebuild/dev-client workflow before simulator verification.
- Use deterministic seeded chat data with enough messages to scroll.
- Verify keyboard open/close behavior on iOS simulator.
- Verify keyboard open/close behavior on Android emulator if available.
- Verify send works while the keyboard is open.
- Verify the composer clears after send and the sent message appears.
- Verify older message pagination still works.

## Dependencies
- None.

## Out Of Scope
- Replacing the full chat UI with a third-party chat SDK.
- Adding attachments, voice input, reactions, or markdown rendering.
- Changing message backend behavior.
