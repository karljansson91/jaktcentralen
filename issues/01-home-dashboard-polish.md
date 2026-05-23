# Home Dashboard Polish

## Fresh Session Brief
Implement this issue independently. Do not rely on prior chat context. This is a UI/product cleanup of the authenticated start page only; do not implement profile internals, friends, invite inbox, or hunt history here unless those routes/APIs already exist.

## Goal
Make the start page feel focused, polished, and action-oriented. The home screen should be a calm dashboard for the user's hunts and areas, without large title/greeting chrome.

## User Story
As a hunter opening the app, I want to immediately see my active hunts and owned areas, with clear actions to join a hunt or create an area, so I do not have to parse a generic overview screen.

## Current State
- Main route: `app/(app)/index.tsx`.
- The start page has prominent brand/title/header content and currently exposes logout directly.
- `Mina jakter` currently has a plus-style action that creates a hunt from an area.
- `Mina områden` lists owned areas and can create new areas.
- Empty states exist, but should become stronger product entry points.
- Hunt creation should remain area-first: user selects an area, then creates a hunt from the area view.

## Desired Behavior
- Remove large title/greeting/header copy from the start page.
- Replace direct logout with a small profile/account button.
- The profile button should be badge-ready for pending inbox items.
- Badge count should eventually include pending hunt invitations and incoming friend requests.
- `Mina jakter` action should be an explicit join-hunt/code action, not a create-hunt plus action.
- `Mina områden` action should create a new area only.
- Empty `Mina jakter` and `Mina områden` sections should use polished action cards:
  - Empty hunts: explain joining with a code and show a primary join CTA.
  - Empty areas: explain creating an area and show a primary create-area CTA.
- Users with existing content should see compact, scannable lists.

## Likely Files And APIs
- `app/(app)/index.tsx` for the home layout and section behavior.
- `components/home/home-section-header.tsx` for section header actions.
- `app/(app)/join.tsx` for the join-code target route.
- `app/(app)/area/create.tsx` for the create-area target route.
- `api.areas.listMyAreas` for owned areas.
- `api.events.listMyEvents` for accepted hunts.
- Optional badge sources, if already available: `api.eventMembers.listMyInvitations` and `api.friends.listPendingReceived`.

## Data Or API Changes
- No Convex schema changes are required for the home cleanup.
- If inbox count queries are not available yet, keep the profile badge component visually ready but hide the badge until Issue 03 is implemented.
- Do not change event creation APIs in this issue.

## Implementation Outline
- Refactor the home top area to remove the old large title/greeting/logout chrome.
- Add a compact profile button in the top-right or equivalent safe-area-correct location.
- Wire the profile button to the profile route if it exists; if not, use the route planned by `02-profile-account-hub.md` without implementing that route here.
- Change `Mina jakter` action to navigate to `/join`.
- Change `Mina områden` action to navigate to `/area/create`.
- Update empty-state cards so each section has copy, iconography, and one clear primary CTA.
- Keep existing hunt and area list item navigation behavior.
- Keep styling aligned with the current NativeWind/custom component system.

## Acceptance Criteria
- The start page no longer shows the old large title/greeting/logout-style header.
- A profile/account button is visible and badge-ready.
- `Mina jakter` has an explicit join-code CTA.
- `Mina jakter` no longer exposes create-hunt as the section action.
- `Mina områden` has a create-area CTA.
- Empty hunt and area sections show polished action cards with clear primary actions.
- Users with both hunts and areas see compact lists without onboarding clutter.
- Users with no hunts or areas still get clear guidance to start.
- Existing navigation to hunt detail and area detail still works.

## Test Plan
- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Use deterministic mocked/seeded query states for home data rather than creating real users.
- Verify the empty state by rendering or running the app with fixture data where `areas=[]` and `events=[]`.
- Verify the areas-only state with fixture data where `areas=[...]` and `events=[]`.
- Verify the populated state with fixture data where both `areas` and `events` contain at least one item.
- Verify the hunts CTA points to `/join`.
- Verify the areas CTA points to `/area/create`.
- Verify no home CTA opens hunt creation directly.
- If the simulator shim is available, capture a Codex/browser screenshot for empty and populated states without manual login/signup.

## Dependencies
- Profile route behavior is specified in `02-profile-account-hub.md`.
- Badge data behavior is specified in `03-friends-and-invite-inbox.md`.

## Out Of Scope
- Profile account UI internals.
- Friend management.
- Hunt invite acceptance.
- Hunt history replay.
- Changing how hunts are created after selecting an area.
