# Hunt Marker Visual Clarity

## Parent

GitHub issue #5: A couple things from the new build.

## Type

AFK - blocked by `24c-hunt-in-position-status.md` for final confirmed-color behavior, but visual marker refactor can begin earlier if implemented behind neutral states.

## Fresh Session Brief

Implement this issue independently. Do not rely on prior chat context. This is a hunt map UI slice focused on making live positions and assigned destinations visually distinct.

## What to build

Replace the current assigned-station marker shape with cleaner Google-style assignment pins, shrink live user position markers, and make the map clearly distinguish where participants are from where they are assigned to go.

## Locked Decisions

- Assignment markers stay visible for assigned participants.
- Assignment pins should look like destination pins, not live user/avatar dots.
- Assignment pins show initials.
- Live position markers are smaller than today.
- Live position markers show profile picture when available, otherwise initials.
- Users without an assigned pass are shown as normal live/last-known position markers.
- Hiding other users' positions must not hide assignment pins.
- Confirmed green assignment-pin state is driven by the in-position status slice.

## Acceptance criteria

- [ ] Assigned destination markers use a cleaner pin shape and no longer look like live position circles.
- [ ] Live user position markers are visually smaller and less dominant than the current implementation.
- [ ] Live markers render profile image when available and initials as fallback.
- [ ] Assignment pins render participant initials.
- [ ] Users without assigned passes render only as normal position markers.
- [ ] Assignment pins remain visible even when other-user live positions are hidden by the later menu toggle.
- [ ] Marker text/images fit cleanly without overlap on narrow phone screens.

## Blocked by

- `24c-hunt-in-position-status.md` for confirmed green state and readiness semantics.

## Test plan

- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Use deterministic hunt map fixtures with assigned users, unassigned users, users with profile photos, and users with initials only.
- Verify live marker size and assignment pin shape in simulator or `localhost:3200`.
- Verify assignment pins and live markers cannot be confused at normal map zoom levels.
- Run the repo-local thermo-nuclear code quality review before committing implementation changes.

## Out of scope

- Position-sharing toggle behavior.
- In-position status mutations and chat messages.
- Drive/såtar-specific assignment resets.
