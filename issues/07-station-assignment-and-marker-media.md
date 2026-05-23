# Station Assignment And Marker Media

## Fresh Session Brief
Implement this issue independently. Do not rely on prior chat context. This issue likely changes Convex schema and uses Convex storage, so read `convex/_generated/ai/guidelines.md` before changing Convex code.

## Goal
Allow the hunt creator to assign participants to map points during a hunt, and restore marker/station image upload.

## User Story
As a hunt creator, I want to tap a marker and assign a participant to it for this hunt, so everyone can see where they should be. As an area owner, I want marker images to work again.

## Current State
- Area points/features can be created and displayed on area/event maps.
- All point markers are informational today.
- Marker image backend support exists through Convex storage.
- Marker UI currently says image upload is temporarily disabled.
- There is no event-specific participant assignment to markers.
- Area editing is owner-only and should remain owner-only.

## Desired Behavior
- All point markers can be assigned to participants for a specific hunt.
- The hunt creator assigns participants by tapping a point marker on the hunt map.
- Assignment UI clearly shows which participant is assigned to which marker.
- Non-creators can view assignments but cannot change them.
- Assigned markers are visually understandable on the hunt map.
- Marker/station image upload is re-enabled.
- Markers can show existing images where relevant.

## Likely Files And APIs
- `convex/schema.ts` for event assignment table.
- `convex/areaFeatures.ts` for image upload URL and feature data.
- New `convex/eventPointAssignments.ts` or equivalent for assignment APIs.
- `app/(app)/event/[eventId]/index.tsx` for tapping point markers in hunt view.
- `components/AreaFeatureLayers.tsx` for marker interaction/rendering.
- `app/(app)/area/[id]/marker.tsx` for marker image upload UI.
- `app/(app)/area/[id]/marker-sheet.tsx` for viewing marker details.
- `expo-image-picker` is already installed.

## Data Or API Changes
- Add event-specific assignment storage. Recommended model:
  - `eventId`
  - `targetKey`, such as `feature:<id>` or `legacy:<id>`
  - `assignedUserId`
  - `createdByUserId`
  - `updatedAt`
- Enforce one active assignment per point marker per event.
- Prefer enforcing one active assigned point per participant per event unless product direction says otherwise.
- Do not store assignment on the area feature itself because assignment is hunt-specific.
- Keep marker image file IDs on `areaFeatures` using existing storage pattern.

## Implementation Outline
- Add assignment table and creator-only mutations for assign, clear, and list by event.
- Verify assignment target belongs to the hunt's area.
- Verify assigned user is an accepted event member.
- Update hunt map point markers to be tappable.
- Show an assignment sheet/action when creator taps a point marker.
- Let creator choose an accepted participant or clear assignment.
- Render assignment state on the map, such as initials/name near the marker.
- Let non-creators view marker/assignment details without edit controls.
- Re-enable image selection/upload in marker form using `areaFeatures.generateUploadUrl`.
- Save uploaded image storage IDs through existing `areaFeatures.save`.

## Acceptance Criteria
- Creator can tap a point marker in hunt view and assign an accepted participant.
- Creator can change or clear an assignment.
- Non-creator can tap/view marker assignment details but cannot edit.
- Assigned marker state persists for the hunt.
- Assignments are event-specific and do not permanently change the area marker itself.
- A participant cannot accidentally be assigned to multiple points in the same hunt if the one-assignment rule is implemented.
- Marker image upload works using existing Convex storage upload URL support.
- Marker images respect existing image limits.
- Uploaded images appear when viewing/editing the marker.

## Test Plan
- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- If Convex schema/functions changed, run the project's Convex codegen/check workflow.
- Add or extend deterministic Convex tests with seeded area, point markers/features, event, creator, and accepted participants.
- Verify creator can assign a seeded accepted participant to a seeded point marker.
- Verify creator can change and clear an assignment.
- Verify non-creator assignment mutations are rejected.
- Verify assignment target must belong to the event's area.
- Verify assigned user must be an accepted event member.
- Verify one-assignment-per-participant/per-marker rules if implemented.
- Test marker image save behavior with mocked/storage fixture file IDs rather than selecting real photos.
- Verify image limit errors are handled with deterministic API/form tests.
- If UI is changed, use fixture marker/event data to inspect assignment sheet/map rendering without manual user setup.

## Dependencies
- Creator-only action model is specified in `05-hunt-info-and-actions.md`.
- Friend/invite flows for participants are specified in `03-friends-and-invite-inbox.md` and `04-hunt-create-invite-share-code.md`.

## Out Of Scope
- Assigning participants to polygon areas.
- Multi-participant assignment to the same marker.
- Area sharing or area roles.
- Push notifications for assignments.
