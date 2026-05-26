# Home Dropdown Animation

## Type

AFK - can start immediately.

## Fresh Session Brief

Implement this issue independently after the planning pass is complete. Do not rely on prior chat context. This is a homepage UI polish issue and should not require Convex changes.

## What to build

Add a smooth, intentional animation to dropdown or expandable sections on the authenticated start page, especially sections that reveal or hide hunt/history content. The animation should make state changes feel polished without slowing down the core home workflow.

## Current state

- `app/(app)/index.tsx` has an `Avslutade` ended-hunts toggle.
- The toggle currently calls `LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)`.
- The chevron swaps instantly between up/down icons rather than visibly rotating.
- If the current animation is not visible enough, this issue should make the interaction feel deliberate rather than just technically animated.
- `components/event/hunt-map-top-nav.tsx` already uses a custom `LayoutAnimation` with opacity create/delete and spring update for a similar expand/collapse detail surface.

## Locked decisions

- Scope this issue only to the startpage `Avslutade` ended-hunts dropdown.
- Do not animate all home hunt/area sections or cards as part of this issue.
- Use `react-native-reanimated` for the visible interaction polish because Expo recommends it for smoother/more advanced animations and it is already installed in this repo.
- Do not add a new animation dependency for this issue.
- Use a standard phone-style expand/collapse motion: quick, calm, and native-feeling, around 180-240ms with easing similar to the platform default.
- Animate the chevron rotation between collapsed and expanded states.
- Animate ended hunt cards with a subtle fade plus slight vertical reveal/slide as the section opens and closes.
- Prefer the least-code clean implementation that satisfies the visible behavior.
- Do not add a reduced-motion branch in this issue.

## Planning questions to resolve

None - decisions are locked.

## Acceptance criteria

- [ ] The target startpage dropdown animates open and closed.
- [ ] The animation uses a quick platform-standard expand/collapse feel rather than a custom bouncy/flourishy motion.
- [ ] The dropdown trigger visibly communicates expanded/collapsed state.
- [ ] The chevron rotates between collapsed and expanded states.
- [ ] Ended hunt cards fade and subtly slide/reveal when shown or hidden.
- [ ] The animation feels responsive and does not block navigation or taps.
- [ ] The collapsed and expanded states preserve the current content and routing behavior.
- [ ] Empty, partial, and populated home states still fit on narrow phones without overlap.
- [ ] Accessibility labels/state remain correct for the dropdown trigger.

## Blocked by

None - can start immediately.

## Test plan

- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Verify the startpage with no hunts, active hunts only, and active plus ended hunts.
- Verify fast repeated open/close taps do not leave the dropdown in a broken intermediate state.
- Verify the animation behaves acceptably on a narrow phone viewport/simulator.

## Out of scope

- Redesigning the full homepage.
- Changing which hunts or areas are returned by backend queries.
- Adding new homepage data.
