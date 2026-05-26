# Wind Direction Picker Clarity

## Type

AFK - can start immediately once local scent plume exists.

## Fresh Session Brief

Implement this issue independently after the planning pass is complete. This issue improves the local wind/scent direction control during an active hunt.

## What to build

Make it clearer how the user sets wind direction and show the currently selected wind direction in the title/header, using an arrow or similarly direct direction indicator. The user should understand both the current direction and how to change it.

## Current state

- `app/(app)/event/[eventId]/index.tsx` stores `scentDirectionDegrees` locally in component state.
- `HuntMapToolsMenu` has `Sätt vindriktning`, `Ändra vindriktning`, and `Rensa vindriktning` actions.
- `ScentDirectionOverlay` currently asks the user implicitly to swipe on a full-map overlay; there is no instructional text.
- `bearingFromScreenSwipe` interprets the swipe direction as the direction the scent plume points toward.
- `ScentPlumeLayer` renders a local plume from the current user coordinate.
- The title/header currently does not show the selected wind/scent direction.

## Locked decisions

- Keep the app language as wind direction rather than rewriting the feature around scent wording.
- Change behavior so the selected direction represents where the wind comes from.
- Render the scent plume in the opposite direction from the selected wind source direction.
- For example, selecting north wind means wind comes from north and the scent plume points south.
- Show the selected wind direction in the title/header as a compact arrow plus Swedish cardinal label, e.g. `Vind N ↑` or `Vind NV ↖`.
- Do not show raw degree values in the normal UI.
- Keep swipe as the direction-setting interaction.
- Replace the current in-map invisible swipe overlay with a dedicated modal screen for setting wind direction.
- The modal screen should have a clear title and instructions, for example telling the user to swipe in the wind direction.
- While the user swipes, the modal should clearly show what direction they are swiping with arrow/cardinal feedback.
- When the swipe completes and passes the minimum distance, set the wind source direction, auto-close the modal, and return to the hunt map.
- If the user cancels/dismisses the modal, leave the previous wind direction unchanged.
- Wind direction remains local-only in this issue.
- Do not add Convex schema/API changes, sharing with other hunters, or persistence.

## Planning questions to resolve

None - decisions are locked.

## Acceptance criteria

- [ ] The wind/scent direction UI clearly indicates the current selected direction.
- [ ] The title/header includes a direction indicator such as an arrow, cardinal label, or planned equivalent.
- [ ] The selected wind direction represents where wind comes from, while the plume renders opposite.
- [ ] The interaction for changing direction is discoverable without accidental map movement.
- [ ] Wind direction is set from a dedicated modal swipe screen, not an invisible map overlay.
- [ ] The modal shows live arrow/cardinal feedback while swiping.
- [ ] Completing a valid swipe auto-closes the modal and updates the hunt map.
- [ ] The control distinguishes wind direction from route, position, and animal sighting controls.
- [ ] Clearing or changing direction remains possible.
- [ ] Existing scent plume behavior remains correct.
- [ ] Wind direction remains local-only with no backend changes.

## Blocked by

- `29-local-scent-plume-indicator.md` if the wind/scent plume feature is not already implemented.

## Test plan

- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Verify direction setting, changing, and clearing in simulator or `localhost:3200`.
- Verify the title/header indicator for north, east, south, west, and diagonal directions.
- Verify map gestures still work and the direction control does not hijack unrelated interactions.

## Out of scope

- Weather API integration.
- Sharing wind direction with other participants.
- Forecasting or changing wind over time.
