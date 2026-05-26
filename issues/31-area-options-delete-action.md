# Area Options Delete Action

## Type

AFK - can start immediately.

## Fresh Session Brief

Implement this issue independently after the planning pass is complete. If this touches Convex area data, read `convex/_generated/ai/guidelines.md` before changing backend code.

## What to build

Add a delete option to the area options button/menu so an area owner can remove an area from the app through a clear destructive flow. The action must be protected against accidental taps and must handle related hunts, markers, invites, and navigation deliberately.

## Current state

- `components/area/area-actions-menu.tsx` shows create hunt, redraw area, update info, and map style actions.
- `convex/areas.ts` already has `remove`, but it is a hard delete that deletes area points, cascades all events through `deleteEventCascade`, and then deletes the area.
- Do not expose the existing hard-delete behavior directly from the UI.

## Locked decisions

- Area deletion should be a soft delete, not a hard delete.
- Preserve underlying area, hunt, chat, track, assignment, marker, and sighting data when an area is deleted.
- Add explicit deleted-state fields to the area record, such as `deletedAt` and, if useful, `deletedByUserId`.
- Hide soft-deleted areas from normal area lists and normal area management flows.
- Keep the existing hard-delete mutation private/unexposed or replace it with soft-delete semantics as part of implementation.
- If an area has existing hunts, soft-deleting the area hides only the area management entry.
- Existing current, future, and ended hunts attached to a soft-deleted area remain accessible from `Mina jakter`, hunt detail, and history.
- Event map/history screens must still be able to read the soft-deleted area's geometry and features needed to render those hunts.
- New hunts cannot be created from a soft-deleted area.
- After deleting an area, navigate the user back to the start screen.
- Direct area management routes for a soft-deleted area, such as area detail, edit, redraw, and create hunt, should block access and send the user back to the start screen or show a not-found state with a start-screen escape.
- `areas.getForEvent` or an equivalent event-scoped area query may still return soft-deleted area map context for hunt screens.
- Add a destructive area menu action titled `Ta bort område` with a trash icon.
- Confirm with title `Ta bort område` and body `Området tas bort från startsidan, men jakter och historik sparas. Vill du fortsätta?`.
- Confirmation buttons are `Avbryt` and destructive `Ta bort område`.
- On failure, show `Kunde inte ta bort område` with the error message or a generic retry message.

## Planning questions to resolve

None - decisions are locked.

## Acceptance criteria

- [ ] The area options menu includes a destructive delete option for users allowed to delete the area.
- [ ] Users who are not allowed to delete the area do not see or cannot complete the delete action.
- [ ] Tapping delete opens a confirmation step before data changes.
- [ ] Cancelling the confirmation leaves the area unchanged.
- [ ] Completing deletion updates the UI and navigates away from the removed area safely.
- [ ] The app shows a clear error if deletion is blocked by related data or permissions.
- [ ] Deleting an area sets deleted-state fields instead of removing the database row.
- [ ] Soft-deleted areas no longer appear in `Mina områden`.
- [ ] Soft deletion does not delete related hunts, chat messages, tracks, assignments, markers, or sightings.
- [ ] Hunts attached to a soft-deleted area remain accessible from hunt lists/history and can still render their map context.
- [ ] Creating a new hunt from a soft-deleted area is not possible.
- [ ] Successful deletion returns the user to the start screen.
- [ ] Direct management access to a soft-deleted area is blocked or redirected to the start screen.
- [ ] Confirmation copy matches the locked Swedish copy.

## Blocked by

None - can start immediately.

## Test plan

- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Run the project's Convex codegen/check workflow if Convex schema/functions change.
- Add deterministic tests for owner, non-owner, missing area, and area-with-related-data cases according to the chosen deletion policy.
- Verify the menu, confirmation, cancel, success, and failure flows in simulator or `localhost:3200`.

## Out of scope

- Bulk deleting multiple areas.
- Undo/restore unless the planning pass chooses soft archive.
- Rebuilding area ownership or sharing rules.
