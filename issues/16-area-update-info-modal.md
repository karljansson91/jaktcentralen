# Area Update Info Modal

## Fresh Session Brief
Implement this issue independently. Do not rely on prior chat context. This issue changes the presentation of the area update-info route so it feels uniform with other modal flows.

## Goal
Make `Uppdatera info` open as a normal modal-style view consistent with the app's other modal screens, instead of feeling like a separate fullscreen flow.

## User Story
As an area owner editing area info, I want the update-info screen to feel like the app's other modal edit flows, so the navigation model is consistent and predictable.

## Current State
- Route registration: `app/(app)/area/[id]/_layout.tsx`.
- Update route: `app/(app)/area/[id]/edit.tsx`.
- Form component: `components/area/edit-area-form.tsx`.
- The `edit` screen currently uses `presentation: 'fullScreenModal'`.
- Other nearby flows use `presentation: 'modal'` or `presentation: 'formSheet'` with consistent background/header styling.

## Desired Behavior
- `Uppdatera info` uses a modal presentation consistent with the app's other edit/create modal screens.
- Header, background, safe-area handling, and dismiss behavior feel uniform.
- Save and cancel/back behavior remain clear in the modal context.
- The modal should work from the area more/options sheet without awkward double-navigation or visual flicker.

## Likely Files And APIs
- `app/(app)/area/[id]/_layout.tsx` for route presentation options.
- `app/(app)/area/[id]/actions.tsx` for how the more sheet closes and opens update-info.
- `app/(app)/area/[id]/edit.tsx` and `components/area/edit-area-form.tsx` for header/content details if needed.
- No Convex APIs are expected to change.

## Data Or API Changes
- None.

## Implementation Outline
- Compare modal presentation options used by marker, invite, members/info, and area event create routes.
- Change the `edit` route away from `fullScreenModal` to the modal style that best matches the app's current convention.
- Ensure the route still has a useful title, header tint, background, and dismiss affordance.
- Verify opening from `/area/[id]/actions` closes or layers correctly without leaving the more sheet stuck behind it.
- Keep form state and save/cancel behavior unchanged.

## Acceptance Criteria
- Tapping `Uppdatera info` opens a modal-style update-info view.
- The modal presentation matches nearby app conventions for background, header, title, and dismissal.
- The old fullscreen-modal feel is gone.
- Saving changes closes the modal and returns to the area context.
- Cancel/back closes the modal without saving.
- Opening update-info from the area more/options sheet does not leave confusing stacked sheets.

## Test Plan
- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Open area more/options for a seeded area, tap `Uppdatera info`, and verify modal presentation.
- Verify save path returns to the area context.
- Verify cancel/back path returns to the area context.
- Verify iOS and Android presentation behavior if both simulators are available.
- Capture or inspect a screenshot to compare header/background with other modal flows.

## Dependencies
- Pairs naturally with `15-remove-manage-markers-from-update-info.md`.

## Out Of Scope
- Redesigning the area info form beyond modal presentation consistency.
- Changing area validation or backend updates.
- Changing marker-management flows.
