# Friends And Invite Inbox

## Fresh Session Brief
Implement this issue independently. Do not rely on prior chat context. This issue touches Convex code, so read `convex/_generated/ai/guidelines.md` before changing Convex functions or schema.

## Goal
Let users add, view, and manage friends, and give users a clear place to accept or decline hunt invitations.

## User Story
As a user, I want to find friends, accept friend requests, and handle hunt invitations from one place, so inviting people to hunts feels natural.

## Current State
- Convex has `friendships` table and `friends.*` APIs for sending, accepting, declining, removing, and listing friends.
- Convex has a `users.searchUsers` query using a name search index.
- Convex has `eventMembers.listMyInvitations`, `acceptInvite`, and `declineInvite`.
- Hunt creation and invite screens depend on accepted friends.
- There is no clear app UI for managing friends, friend requests, or hunt invite inbox items.

## Desired Behavior
- Add a friends/inbox experience reachable from the profile hub.
- The friends screen includes accepted friends, incoming friend requests, outgoing friend requests, and add/search friend flow.
- Friend search should reuse Convex search where possible.
- Search should support name and email.
- Pending hunt invitations are handled in the profile/inbox area.
- Hunt invites can be accepted or declined.
- Accepted hunt invites navigate to or reveal the hunt in `Mina jakter`.
- Incoming friend requests and hunt invitations contribute to the profile badge count.

## Likely Files And APIs
- `convex/schema.ts` for any needed user search index changes.
- `convex/users.ts` for name/email search.
- `convex/friends.ts` for friendship actions and list queries.
- `convex/eventMembers.ts` for hunt invite list/accept/decline.
- New profile/friends/inbox routes under `app/(app)/profile...` or equivalent.
- Existing `app/(app)/area/[id]/event/create.tsx` and `app/(app)/event/[eventId]/invite.tsx` consume accepted friends.

## Data Or API Changes
- Add email search support if current Convex search only covers name.
- Prefer a bounded search result set and exclude the current user.
- Keep the existing `friendships` model unless a concrete bug requires a schema change.
- Add a small count query if needed for profile badge: pending hunt invites plus incoming friend requests.
- Avoid exposing all users without a query string.

## Implementation Outline
- Build a friends/inbox route reachable from profile.
- Show incoming friend requests with accept/decline actions.
- Show outgoing friend requests as pending/read-only.
- Show accepted friends with remove/unfriend action if practical.
- Add search by name/email and send friend request action.
- Surface pending hunt invitations with accept/decline actions.
- On accepting a hunt invite, navigate to the hunt or make the accepted hunt visible in `Mina jakter`.
- Wire count data into the profile badge.
- Keep error handling friendly for duplicate requests, self requests, and already-invited states.

## Acceptance Criteria
- A user can search for another user by name.
- A user can search for another user by email.
- A user cannot send a friend request to themselves.
- A user can send a friend request.
- A recipient can accept or decline the friend request.
- Accepted friends appear in the friends list.
- Sent pending requests are visible to the sender.
- Pending hunt invites appear in the profile/inbox area.
- A user can accept a hunt invite and then open the hunt.
- A user can decline a hunt invite and it no longer appears as actionable.
- Profile badge count reflects incoming friend requests and pending hunt invites.

## Test Plan
- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- If Convex schema/functions changed, run the project's Convex codegen/check workflow.
- Add or extend deterministic Convex tests for friendship and invite behavior; do not use real Clerk signup or email verification.
- In tests, seed at least three users with mocked identities: current user, target friend, and unrelated user.
- Verify sending a friend request creates outgoing state for sender and incoming state for recipient.
- Verify accepting a request makes both users see each other as friends.
- Verify declining a request removes the pending request.
- Verify duplicate and self friend requests are rejected.
- Verify search by name and email using seeded users.
- Seed a hunt invitation and verify it contributes to the profile badge/inbox count.
- Verify accepting a seeded hunt invite changes membership to accepted and makes the hunt accessible to that mocked user.
- Verify declining a seeded hunt invite removes it from actionable inbox state.
- If UI is changed, render/use simulator fixture state for the friends screen and invite inbox without requiring real account creation.

## Dependencies
- Profile hub is specified in `02-profile-account-hub.md`.
- Hunt invite creation and share code behavior is specified in `04-hunt-create-invite-share-code.md`.

## Out Of Scope
- Push notifications.
- Blocking or reporting users.
- Friend codes or share links.
- Group/team management.
