# Compact Create Hunt Friend Cards

## Type

AFK - can start immediately.

## Fresh Session Brief

Implement this issue independently after the planning pass is complete. This is a create-hunt invite UI density issue.

## What to build

Make the friend cards in the create-hunt flow much more compact and scan-friendly. Users should be able to invite friends without oversized cards consuming the screen, while still seeing enough identity information to pick the right people.

## Current state

- `app/(app)/area/[id]/event/create.tsx` renders each friend as a full `Card` with `CardHeader`, a square checkbox, and the friend's name.
- `components/user-avatar.tsx` can render a profile image when `imageUrl` exists, or initials otherwise.
- `api.friends.listFriends` returns each accepted friend with its user record.

## Locked decisions

- Replace full friend cards with compact inline rows.
- Each row should use the friend's profile picture via `UserAvatar` when available, falling back to initials.
- Keep selected and unselected friends inline in the same list.
- Do not add search in this issue.
- Show the friend's display name as the primary line.
- Show email or phone as a muted secondary line when available.
- If no contact line exists, keep the row compact and one-line rather than adding filler text.
- Use a trailing circular selected-state indicator.
- Preserve the existing selected friend state and invite payload behavior.

## Planning questions to resolve

None - decisions are locked.

## Acceptance criteria

- [ ] Friend entries in create hunt are visibly smaller than the current cards.
- [ ] Multiple friends fit on screen without excessive scrolling.
- [ ] Selected and unselected states are obvious.
- [ ] Friend rows show profile image/initials, display name, optional contact line, and a trailing circular selection indicator.
- [ ] Rows remain easy to tap and meet practical mobile hit-target size.
- [ ] Empty, loading, and no-friends states still render cleanly.
- [ ] The invite payload and selected friend behavior remain unchanged.

## Blocked by

None - can start immediately.

## Test plan

- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Verify create hunt with zero, one, and many friends.
- Verify selecting, deselecting, and submitting invited friends.
- Verify narrow phone layout and long names/emails do not overflow.

## Out of scope

- Rebuilding the friends system.
- Adding new friend search behavior.
- Changing invitation permissions or backend invite storage.
