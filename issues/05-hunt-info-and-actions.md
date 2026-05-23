# Hunt Info And Actions

## Fresh Session Brief
Implement this issue independently. Do not rely on prior chat context. This is primarily a hunt UI/actions refactor with creator-only admin behavior. If Convex permission changes are needed, read `convex/_generated/ai/guidelines.md` first.

## Goal
Rework the hunt `...` menu and participant screen into a clear hunt info/action flow with creator-only admin controls.

## User Story
As a hunt participant, I want the more menu to show useful hunt info and relevant actions only, so I can understand the hunt and avoid confusing navigation/actions.

## Current State
- Hunt actions include `Gå till startvyn`, `Deltagare`, invite for admins, and leave/end.
- Members screen lists participants but does not expose richer hunt information.
- Backend contains role/admin concepts, including member promotion.
- Desired product model is creator-only admin: only the hunt creator has admin controls.

## Desired Behavior
- Remove `Gå till startvyn` from the hunt more/actions menu.
- Rename/rework `Deltagare` into `Info`.
- `Info` shows hunt title, date/time/status, area name, participant list, roles/status, and last-seen/tracking status.
- Join code is visible to the creator when relevant.
- Creator-only controls include invite/share, remove participant, and end/archive hunt.
- Non-creators can view info and leave the hunt.
- Do not expose promote-admin UI.

## Likely Files And APIs
- `app/(app)/event/[eventId]/actions.tsx` for the more/actions sheet.
- `app/(app)/event/[eventId]/members.tsx` if it becomes the info screen or is replaced.
- `app/(app)/event/[eventId]/_layout.tsx` for sheet/route presentation.
- `convex/events.ts` for event data and end/archive action if Issue 06 is included.
- `convex/eventMembers.ts` for listing members, leaving, and removing participants.
- `api.areas.getForEvent` for area name in info.

## Data Or API Changes
- No schema change is required for info display.
- UI should treat `event.creatorId` as the creator/admin source of truth.
- Existing `eventMembers.role` may remain, but do not expose promotion in UI.
- If backend remove/invite/end permissions currently use role, align them to creator-only where needed.

## Implementation Outline
- Replace or rename the participants route/sheet as `Info`.
- Remove the `Gå till startvyn` action.
- Build a concise info layout with event summary and participant list.
- Show last seen and paused/stale tracking status when available.
- Gate invite/share, remove participant, and end/archive controls behind creator check.
- Keep leave action available to non-creators.
- Ensure creator end action points to archive behavior once `06-hunt-ending-and-history-replay.md` is implemented.

## Acceptance Criteria
- Hunt `...` menu no longer includes `Gå till startvyn`.
- `Deltagare` wording is replaced with `Info`.
- Info screen includes hunt summary and participant information.
- Creator sees invite/share, remove participant, and end hunt controls.
- Non-creator does not see creator-only controls.
- Non-creator can leave the hunt.
- Creator cannot leave the hunt as a normal member.
- Promote-admin UI does not exist.
- Participant last-seen/tracking-paused state is displayed when data exists.

## Test Plan
- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Use seeded/mock event data with at least creator, accepted participant, and removed/left participant states.
- Verify creator action visibility with a route/component test or simulator fixture.
- Verify non-creator action visibility with the same deterministic fixture approach.
- Verify `Info` renders hunt summary, area name, participant list, role/status, and last-seen/tracking status from fixture data.
- Add or extend deterministic Convex tests if remove/leave permission logic changes.
- Verify creator can remove a seeded participant and that participant loses access in API tests.
- Verify non-creator can leave and creator cannot use the normal leave path.
- Verify non-creator cannot remove participants.
- If Issue 06 has been implemented, verify creator end action calls archive/end rather than destructive remove.

## Dependencies
- Invite/share behavior is specified in `04-hunt-create-invite-share-code.md`.
- Archive/end behavior is specified in `06-hunt-ending-and-history-replay.md`.
- Tracking status display is specified in `08-live-background-tracking.md`.

## Out Of Scope
- Multi-admin role promotion.
- Editing hunt metadata from the info screen.
- Hunt replay/history UI.
