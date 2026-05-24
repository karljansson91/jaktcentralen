# Remove Area More View Hunts

## Fresh Session Brief
Implement this issue independently. Do not rely on prior chat context. This is a narrow UI removal in the area more/options sheet.

## Goal
Remove `Visa jakter` from the area more options menu.

## User Story
As an area owner opening the more menu, I want only the most relevant area actions shown, so the menu stays compact and does not include redundant navigation.

## Current State
- Main route: `app/(app)/area/[id]/actions.tsx`.
- The area more/options sheet currently includes an action labeled `Visa jakter`.
- The action navigates to `/area/${id}/events`.
- The area events route exists at `app/(app)/area/[id]/events.tsx`.

## Desired Behavior
- `Visa jakter` is no longer shown in the area more/options sheet.
- Removing the menu item should not delete the events route unless another issue explicitly asks for that.
- Other area actions remain available and keep their current behavior.
- Sheet spacing still looks good after the action is removed.

## Likely Files And APIs
- `app/(app)/area/[id]/actions.tsx` for the menu item.
- `app/(app)/area/[id]/events.tsx` should normally remain untouched.
- No Convex APIs are involved.

## Data Or API Changes
- None.

## Implementation Outline
- Remove the `AreaActionButton` that has `label="Visa jakter"` and `accessibilityLabel="Visa jakter"`.
- Remove unused imports/helpers if the route removal leaves any dead code.
- Verify remaining actions still fit and navigate correctly.
- Coordinate final spacing with `10-area-more-sheet-padding.md` if both are implemented together.

## Acceptance Criteria
- Area more/options sheet no longer contains `Visa jakter`.
- No accessibility label or visible text for `Visa jakter` remains in the area more/options sheet.
- `Skapa jakt`, `Rita om area`, `Uppdatera info`, and map style actions still work unless separately changed.
- The `/area/[id]/events` route is not deleted by this issue.

## Test Plan
- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Open the area more/options sheet with a seeded area and verify `Visa jakter` is absent.
- Verify each remaining action still responds.
- Add a simple component/route assertion if the project has a route rendering harness.

## Dependencies
- None.

## Out Of Scope
- Deleting area hunt history/list functionality.
- Redesigning the more sheet beyond spacing required after item removal.
