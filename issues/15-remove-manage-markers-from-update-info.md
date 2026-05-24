# Remove Manage Markers From Update Info

## Fresh Session Brief
Implement this issue independently. Do not rely on prior chat context. This is a narrow form cleanup for the area update-info screen.

## Goal
Remove `Hantera markörer` / `Hantera markörer på kartan` from the area update-info form.

## User Story
As an area owner editing area info, I want the update-info modal to focus only on the area's name and description, so marker management stays on the map where it belongs.

## Current State
- Form component: `components/area/edit-area-form.tsx`.
- Route: `app/(app)/area/[id]/edit.tsx`.
- The form currently includes an outline button labeled `Hantera markörer på kartan`.
- The button navigates/replaces back to the area map route.

## Desired Behavior
- The update-info form only includes area info fields and save/cancel controls.
- No marker-management CTA is visible in this form.
- Marker creation/editing remains available from the area map interactions and marker-specific screens.
- Removing the button should improve vertical rhythm and not leave a large empty gap.

## Likely Files And APIs
- `components/area/edit-area-form.tsx`.
- Potential cleanup in `app/(app)/area/[id]/edit.tsx` only if route props/imports change.
- No Convex API changes expected.

## Data Or API Changes
- None.

## Implementation Outline
- Remove the button that navigates to marker management.
- Remove now-unused router helpers/imports such as `replace` if applicable.
- Rebalance spacing so save/cancel controls remain comfortably placed.
- Keep existing name/description validation and update mutation behavior.

## Acceptance Criteria
- `Hantera markörer på kartan` is not visible on update-info.
- No `Hantera markörer` accessibility label or route action remains in the update-info form.
- Updating area name still works.
- Updating area description still works.
- Cancel/back behavior still works.
- Marker management remains available through the normal map marker flow.

## Test Plan
- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Render/open update-info with a seeded area and verify the marker-management button is absent.
- Verify save with valid name succeeds.
- Verify empty name still shows validation/error behavior.
- Verify cancel/back returns to the previous area view.

## Dependencies
- Pairs naturally with `16-area-update-info-modal.md`, but can be implemented independently.

## Out Of Scope
- Changing marker creation/editing flows.
- Changing area schema or validation rules beyond existing name/description behavior.
