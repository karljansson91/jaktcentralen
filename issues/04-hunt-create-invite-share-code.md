# Hunt Create Invite Share Code

## Fresh Session Brief
Implement this issue independently. Do not rely on prior chat context. This issue touches Convex event/member rules, so read `convex/_generated/ai/guidelines.md` before changing Convex functions or schema.

## Goal
Improve the hunt creation and invite experience so creators can set a useful join code, invite friends, and later share or invite from the hunt.

## User Story
As a hunt creator, I want an easy suggested join code and a single invite/share screen, so I can get participants into the hunt without typing awkward codes or switching flows.

## Current State
- Hunts have an optional `joinCode`.
- Users can join a hunt by code via `/join`.
- Hunt creation can invite selected friends.
- The `Bjud in fler` screen lists friends to invite.
- `eventMembers.invite` currently allows accepted members to invite if backend rules have not been tightened.
- Invite/share behavior is not polished around codes and suggestions.

## Desired Behavior
- Hunt creation keeps an editable join-code input.
- Under the join-code input, show suggestion chips derived from area name and date.
- Suggestions should be readable, lowercase-compatible, and easy to select.
- The creator can invite friends while creating a hunt.
- The `Bjud in fler` screen shows current join code, native share action, and friend invite list.
- Friend invite rows show member/invited/pending states.
- Only the hunt creator can invite, share code, remove participants, or end the hunt.
- Users can still join a hunt by entering a valid code from home.

## Likely Files And APIs
- `app/(app)/area/[id]/event/create.tsx` for hunt creation UI.
- `app/(app)/event/[eventId]/invite.tsx` for `Bjud in fler`.
- `app/(app)/join.tsx` for join-code entry.
- `convex/events.ts` for create/update/join code validation and uniqueness.
- `convex/eventMembers.ts` for creator-only invite permissions.
- `convex/friends.ts` for accepted friend list.

## Data Or API Changes
- No schema change is required if `joinCode` remains on `events`.
- Backend should enforce join-code uniqueness when a code is present.
- Backend should normalize or validate codes consistently with UI.
- Backend invite mutation should enforce creator-only invite permissions.
- Existing optional join-code behavior may remain; if no code exists, the invite screen should explain that code sharing is unavailable until a code is set.

## Implementation Outline
- Generate suggestion chips from area name and date, such as normalized `areaname-YYYYMMDD`.
- Normalize Swedish characters and spaces into code-safe lowercase text.
- Keep manual editing possible.
- Validate code before create/update and show clear error messages.
- Add or verify uniqueness checks before saving a join code.
- Update invite screen to show code/share area above friend invite list.
- Use React Native's native share sheet for v1 sharing.
- Tighten invite permission checks to hunt creator only.
- Hide or block invite/share UI for non-creators.

## Acceptance Criteria
- Creating a hunt with a selected suggested code saves that code.
- Creating a hunt with a manual join code saves that code.
- Invalid codes show clear validation errors.
- Duplicate join codes are rejected safely.
- Suggestion chips include an area/date-based option.
- Creator can select friends to invite during hunt creation.
- Creator can open `Bjud in fler` from hunt actions and see code/share/friends UI.
- Creator can invite additional friends from `Bjud in fler`.
- Non-creators cannot access invite/share controls.
- Users can join a hunt from home using a valid code.

## Test Plan
- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- If Convex functions changed, run the project's Convex codegen/check workflow.
- Add or extend deterministic tests for join-code normalization, validation, uniqueness, and join-by-code behavior.
- Use seeded area/event/friend/member data with mocked authenticated users; do not create real accounts.
- Verify a suggested area/date code is generated from fixed area/date fixture input.
- Verify creating a hunt with a selected suggested code saves that code.
- Verify creating a hunt with a manual join code saves that code.
- Verify invalid uppercase/special join codes produce validation errors.
- Verify duplicate join codes are rejected.
- Verify creator can invite seeded friends during creation and that invitation rows are created.
- Verify non-creator invite/share attempts are rejected at API level and hidden/blocked in UI.
- Verify a seeded user can join a hunt through `joinByCode` with a valid code.
- If simulator is available, inspect `Bjud in fler` with seeded/mock friend data and verify code/share/friends UI without manual login.

## Dependencies
- Friend list behavior is specified in `03-friends-and-invite-inbox.md`.
- Creator-only action model is also used by `05-hunt-info-and-actions.md`.

## Out Of Scope
- Public discoverable hunts.
- Friend request management.
- Push notifications for invites.
- Non-creator invite permissions.
