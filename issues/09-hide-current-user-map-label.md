# Hide Current User Map Label

## Fresh Session Brief
Implement this issue independently. Do not rely on prior chat context. This is a small hunt map display fix. If changing Convex membership/location data, read `convex/_generated/ai/guidelines.md` first.

## Goal
Stop rendering the current user's name/initials marker on top of their own live location indicator. The blue Mapbox location puck is enough for the current user.

## User Story
As a hunter looking at the live hunt map, I want my own position to be shown only by the standard blue location indicator, so the map does not feel cluttered or show overlapping identity markers.

## Current State
- Main route: `app/(app)/event/[eventId]/index.tsx`.
- The hunt map renders `LocationPuck` for the current user's device location.
- The same map also builds `memberPositionsGeoJSON` from accepted members with last known coordinates.
- `memberPositionsGeoJSON` currently includes the current user when the backend has their last location.
- This can place an initials/name marker directly over the blue current-location indicator.

## Desired Behavior
- The current user is excluded from the member-position initials/name overlay.
- Other accepted members still render exactly as before.
- The current user still sees the blue location puck.
- If the current user's backend location exists, it can still be used for calculations such as station route/trail fallback; only the visual overlay is hidden.
- Accessibility labels and map layers should not expose a redundant current-user marker.

## Likely Files And APIs
- `app/(app)/event/[eventId]/index.tsx` for filtering member marker GeoJSON.
- `api.users.getCurrentUserProfile` for current user identity.
- `api.eventMembers.listAccepted` or equivalent current member list query used by the event screen.
- No backend change is expected.

## Data Or API Changes
- No schema changes required.
- No mutation changes required.
- Do not stop publishing or storing the current user's live location; this issue only changes map presentation.

## Implementation Outline
- Update the member-position feature construction to skip `member.userId === currentUser._id`.
- Keep the current user's coordinates available in `currentUserMemberCoordinate`.
- Ensure the member-position layer remains stable when `currentUser` is still loading.
- Confirm that other members with coordinates continue to show initials/name markers.
- Confirm `LocationPuck` remains visible.

## Acceptance Criteria
- The current user's initials/name marker does not render on the hunt map.
- The blue current-location indicator still renders when location permission is available.
- Other members' initials/name markers still render when their locations are known.
- Route/trail logic that uses the current user's location still works.
- No duplicate or overlapping current-user identity marker is visible near the blue location puck.

## Test Plan
- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Use deterministic fixture/mock data with current user plus at least one other accepted member, both with last known coordinates.
- Verify the generated member-position feature collection excludes the current user's member row.
- Verify the same feature collection includes the other member.
- If simulator/map inspection is available, capture a screen where the current user has both device location and backend member location and confirm only the blue location indicator represents the current user.

## Dependencies
- None.

## Out Of Scope
- Changing location tracking frequency.
- Changing how member locations are stored.
- Redesigning other map marker styles.
- Hiding assigned station markers.
