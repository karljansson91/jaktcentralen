# Friend Search By App Profile

## Parent

GitHub issue #5: A couple things from the new build.

## Type

AFK - can start immediately.

## Fresh Session Brief

Implement this issue independently. Do not rely on prior chat context. This issue touches Convex schema/functions and profile UI, so read `AGENTS.md` and `convex/_generated/ai/guidelines.md` before changing Convex code.

## What to build

Let users maintain a Jaktcentralen app profile with editable display/contact fields, then search those app profiles by name, email, or phone number when adding friends. Clerk remains the authentication source and profile image source, but friend discovery should search Convex app data, not Clerk Backend API live search.

## Locked Decisions

- Do not use Clerk `getUserList` for normal friend search.
- Keep friendships in Convex and keep friend requests keyed by Convex `users` ids.
- Add phone number to the Convex app profile.
- Use separate Convex search indexes for name, email, and phone number, then run a multi-search and merge/dedupe results.
- Split Clerk-synced identity from editable app profile data so future Clerk sync does not overwrite user edits.
- Profile image remains Clerk-backed/cached in Convex; image editing is out of scope for this issue.

## Acceptance criteria

- [ ] A new or returning authenticated user has Clerk identity fields synced/cached into Convex without clobbering editable app profile fields.
- [ ] Users can edit their Jaktcentralen display name, contact email, and phone number from the profile area.
- [ ] Add-friend search copy clearly says users can search by name, email, or phone.
- [ ] Friend search queries Convex app profiles by name, email, and phone number, merges duplicate hits, excludes the current user, and returns a bounded result set.
- [ ] Phone number search works with normalized phone input and avoids overly broad matches, for example by requiring a useful minimum digit count before querying phone.
- [ ] Sending, accepting, declining, and listing friend requests continue to use existing Convex friendship behavior.
- [ ] Clerk profile image is still shown where available, but this issue does not add image editing.

## Blocked by

None - can start immediately.

## Test plan

- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Run the project's Convex codegen/check workflow if schema/functions change.
- Add deterministic Convex tests for profile sync defaults, profile edit persistence, and name/email/phone search result merging.
- Verify a later Clerk sync updates cached Clerk fields but does not overwrite an edited app display name/contact email/phone number.
- Verify duplicate search hits across name/email/phone collapse to one user.
- Verify self-search results are excluded.
- Verify friend requests still work using Convex user ids.
- Run the repo-local thermo-nuclear code quality review before committing implementation changes.

## Out of scope

- Clerk Backend API user search.
- Editing Clerk account/security email from Jaktcentralen profile.
- Editing Clerk profile image from Jaktcentralen profile.
- Inviting people who do not yet have a Convex app user row.
