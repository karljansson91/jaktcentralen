# Profile Account Hub

## Fresh Session Brief
Implement this issue independently. Do not rely on prior chat context. The goal is to replace direct logout with a profile/account hub. Use Clerk's native profile UI where possible, and keep app-specific navigation such as friends and inbox in a Jaktcentralen shell.

## Goal
Replace the home logout button with a profile/account hub that gives users one place for account management, logout, friends, and pending inbox items.

## User Story
As a signed-in user, I want a profile page where I can manage my account, log out, and find friend/invite requests, so account actions are not scattered around the app.

## Current State
- The start page exposes logout directly.
- Clerk is installed through `@clerk/expo`.
- `app.json` already includes the `@clerk/expo` plugin.
- `@clerk/expo/native` provides native Clerk profile UI for account/profile/logout behavior.
- Convex mirrors Clerk identity into the `users` table via `users.getOrCreateCurrentUser`.
- Friend and invite backend APIs exist, but there is no clear profile/inbox surface.

## Desired Behavior
- The home screen opens a profile route instead of logging out directly.
- The profile route uses a hybrid model:
  - Jaktcentralen-native shell for app-specific navigation like friends and inbox.
  - Clerk native profile/account UI for account details and logout.
- The profile entry point can show a badge when there are pending attention items.
- Badge count includes pending hunt invitations and incoming friend requests.
- The profile hub links to friend management.
- The profile hub links to hunt invite inbox management.
- Signing out from Clerk profile should return the user to the auth flow.

## Likely Files And APIs
- `app/(app)/index.tsx` for the home profile button entry point.
- New profile route under `app/(app)/profile...` or equivalent Expo Router location.
- `app/(app)/_layout.tsx` if the new profile route needs stack/sheet options.
- `@clerk/expo/native` for Clerk native `UserProfileView`.
- `api.users.getCurrentUserProfile` for current app user display.
- `api.eventMembers.listMyInvitations` for pending hunt invite count.
- `api.friends.listPendingReceived` for incoming friend request count.

## Data Or API Changes
- No Convex schema changes are required.
- Use Clerk as the source of truth for account/profile details.
- Convex user records should continue to mirror Clerk identity for app display.
- If the profile badge query shape is missing, add a small Convex query that returns counts only.

## Implementation Outline
- Add a profile/account route.
- Build a NativeWind/Jaktcentralen shell with user summary, inbox/friends rows, and Clerk account UI.
- Embed Clerk native profile UI if it works in the dev client.
- Provide a graceful fallback if Clerk native profile UI is unavailable on a platform.
- Replace the home logout button with navigation to the profile route.
- Add badge rendering based on pending invite and incoming friend request counts.
- Ensure sign-out from Clerk causes the app to return to the signed-out auth state.

## Acceptance Criteria
- Home logout button is removed.
- Home profile button opens the profile hub.
- Profile hub exposes Clerk account/profile/logout UI.
- Profile hub links to friend management.
- Profile hub shows or links to pending hunt invites.
- Badge count is visible on the home profile button when pending items exist.
- Badge count includes both incoming friend requests and pending hunt invites.
- Badge disappears after requests and invites are handled.
- Signing out through the profile hub works reliably.

## Test Plan
- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Use an existing dev session, mocked Clerk hooks, or a local auth fixture; do not require creating a new real Clerk user.
- Verify the home profile button navigates to the profile route with a route/unit test or Codex browser interaction.
- Verify the profile route renders the Jaktcentralen shell with mocked current-user data.
- Verify the Clerk native profile UI path is imported/rendered behind a platform-safe wrapper.
- Verify fallback UI renders when native Clerk UI is unavailable by mocking that unsupported state.
- Verify logout calls Clerk sign-out through a mocked Clerk API or existing test session.
- Verify badge count using deterministic mocked/seeded pending invite and friend request counts.
- Verify badge clears when mocked counts return zero.

## Dependencies
- Home profile entry point is specified in `01-home-dashboard-polish.md`.
- Friends and invite inbox behavior is specified in `03-friends-and-invite-inbox.md`.

## Out Of Scope
- Building a fully custom profile editor.
- Avatar upload outside Clerk.
- App settings unrelated to profile/friends/inbox.
- Push notifications.
