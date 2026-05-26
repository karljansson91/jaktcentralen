# Restore Round Map And Options Buttons

## Type

AFK - can start immediately.

## Fresh Session Brief

Implement this issue independently after the planning pass is complete. This is a visual regression fix for floating map and options controls.

## What to build

Restore the intended round shape for the map button and options buttons that have regressed into non-round controls. Icon-only floating controls should have stable equal width and height, centered icons, and fully round borders while matching the app's existing glass/control styling.

## Current state

- Hunt map tools, hunt options, and area options use `GlassMenuButton`.
- `GlassMenuButton` has a generic implementation in `components/glass/glass-menu-button.tsx` and an iOS native implementation in `components/glass/glass-menu-button.ios.tsx`.
- The iOS native implementation renders Expo SwiftUI `Menu` with `buttonStyle('glass')`, `labelStyle('iconOnly')`, and a fixed frame, but the resulting visual shape can regress away from a circle.
- `GlassIconButton` and `GlassFloatingButton` already express circular shape through equal size plus `rounded-full`.

## Locked decisions

- Scope this issue to all icon-only `GlassMenuButton` controls.
- This includes the hunt map tools button, hunt options ellipsis button, and area options ellipsis button.
- Fix the shared menu button primitive rather than patching each screen separately.
- Text-bearing buttons and wider action pills must remain pill/rounded-rectangle controls and should not be forced into circles.
- Harden both `GlassMenuButton` implementations: the iOS native SwiftUI menu button and the generic fallback button.
- Follow platform best practices by preserving native menu behavior while fixing sizing, shape, and icon centering at the shared primitive boundary.
- Avoid per-screen styling hacks unless a call site passes an incorrect size or class that must be corrected.

## Planning questions to resolve

None - decisions are locked.

## Acceptance criteria

- [ ] The affected map button renders as a circle.
- [ ] The affected options buttons render as circles when they are icon-only controls.
- [ ] Buttons keep stable dimensions across loading, hover/pressed, and disabled states.
- [ ] Icons remain visually centered and large enough to tap.
- [ ] Hit targets remain at least platform-appropriate minimum size.
- [ ] The fix does not distort text buttons or wider action pills.
- [ ] Both `glass-menu-button.ios.tsx` and the generic `glass-menu-button.tsx` preserve circular icon-only controls.
- [ ] Native menu presentation and action handling remain unchanged.

## Blocked by

None - can start immediately.

## Test plan

- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Inspect affected screens in simulator or `localhost:3200`.
- Verify narrow phone layouts do not clip circular controls.
- Verify pressed/disabled states preserve the round shape.

## Out of scope

- Replacing the app button system.
- Full redesign of map controls.
- Adding new map actions.
