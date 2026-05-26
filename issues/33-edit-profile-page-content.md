# Edit Profile Page Content

## Type

AFK - can start immediately.

## Fresh Session Brief

Implement this issue independently after the planning pass is complete. If profile data or Convex user records are changed, read `convex/_generated/ai/guidelines.md` before changing backend code.

## What to build

Fix the edit profile page so it no longer appears empty. The page should render a clear editable profile form, loading/error states, and save/cancel behavior consistent with the profile account hub.

## Current state

- `app/(app)/profile/edit.tsx` already contains a form for name, contact email, and phone number.
- The form saves through `api.users.updateAppProfile`.
- `app/(app)/_layout.tsx` presents `profile/edit` as a form sheet with `headerShown: false`, detents `[0.58, 0.86]`, and no native header.
- The reported empty-page symptom may be a presentation/layout/loading-state issue rather than a missing component.

## Locked decisions

- Keep this screen scoped to Convex app-profile fields that already exist: display name, contact email, and phone number.
- Do not update Clerk account data in this issue.
- Do not add avatar editing/upload in this issue.
- Do not add new hunting profile fields in this issue.
- Keep `profile/edit` as a form-sheet presentation.
- Add or preserve a clear in-sheet content header so the sheet never looks empty even with `headerShown: false`.
- Ensure the sheet content has enough top padding, visible title/context, and usable cancel/save actions in the first visible area.
- Use the repo's existing form approach, `@tanstack/react-form`, for field state and validation.
- Show an explicit save button.
- Make validity visible with inline validation messages near each relevant field.
- Name is required.
- Contact email is required and must look like an email address.
- Phone number is optional.
- Empty optional phone should save as `undefined`.
- Save should be disabled while submitting and when the form has no valid changes.

## Planning questions to resolve

None - decisions are locked.

## Acceptance criteria

- [ ] Navigating to edit profile shows visible content instead of an empty page.
- [ ] Loading, missing-data, and error states are visible and recoverable.
- [ ] Supported profile fields can be edited and saved.
- [ ] Save is disabled or guarded when no valid changes are present.
- [ ] The form uses `@tanstack/react-form` rather than ad hoc field state.
- [ ] Name and contact email validation errors are visible inline.
- [ ] Phone number is optional and can be cleared.
- [ ] The save button is explicit and easy to find.
- [ ] Cancel/back returns to the profile page without losing app navigation state.
- [ ] The page uses existing app styling and spacing.

## Blocked by

None - can start immediately.

## Test plan

- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Run Convex codegen/check if profile APIs change.
- Test with a complete profile, a partially empty profile, and a failed save.
- Verify keyboard behavior and field alignment on a narrow phone viewport/simulator.

## Out of scope

- Building a full account-management replacement for Clerk.
- Friend search behavior except where directly affected by edited profile fields.
- Avatar upload unless explicitly chosen in planning.
