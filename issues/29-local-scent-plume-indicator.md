# Local Scent Plume Indicator

## Parent

GitHub issue #5: A couple things from the new build.

## Type

AFK - blocked by `24d-hunt-map-tools-menu-and-position-sharing.md`.

## Fresh Session Brief

Implement this issue independently. Do not rely on prior chat context. This is a local-only active hunt map tool. It should not add Convex schema, weather integration, or shared wind state.

## What to build

Add a local scent/wind direction tool to the active hunt map tools menu. The user can set scent direction with a simple swipe gesture on the map, see a tasteful scent-spread plume from their current position, and clear it when they no longer want it shown.

## Locked Decisions

- Add the tool to the new hunt map tools menu from `24d-hunt-map-tools-menu-and-position-sharing.md`.
- Keep this as a separate issue blocked by that menu issue.
- Active hunt view only.
- Local-only on the phone for now.
- No Convex storage.
- No weather forecast integration.
- No text label on the map.
- Show a visual scent spread indicator as an area/cone/plume, not just a plain arrow.
- The plume originates from the current user's current position.
- If current user position is unavailable, show nothing.
- The plume follows the current user as their position updates.
- Direction is set with a simple swipe gesture anywhere on the map, like Fruit Ninja.
- The swipe vector determines scent direction.
- The user can clear the scent direction; after clearing, no plume is shown.
- Fixed plume length/width for v1; no strength/spread controls.

## Acceptance criteria

- [ ] Active hunt map tools menu includes a scent/wind direction action.
- [ ] Choosing the action enters a clear direction-setting mode on the map.
- [ ] Swiping anywhere on the map sets the local scent direction from the swipe vector.
- [ ] A semi-transparent scent plume renders from the current user's position.
- [ ] The plume moves with the current user's position as location updates.
- [ ] If current user position is unavailable, no plume is rendered.
- [ ] The user can clear the direction and remove the plume.
- [ ] No scent/wind state is written to Convex or shared with other participants.
- [ ] Ended hunts/history replay do not expose this live scent tool.

## Blocked by

- `24d-hunt-map-tools-menu-and-position-sharing.md`

## Test plan

- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Use simulator or `localhost:3200` to verify menu entry, swipe-to-set interaction, plume rendering, and clear behavior.
- Verify no Convex schema/functions are added for this local-only state.
- Verify plume rendering with seeded/current location and hidden state with unavailable location.
- Verify the plume does not overlap map controls in an incoherent way.
- Run the repo-local thermo-nuclear code quality review before committing implementation changes.

## Out of scope

- Weather forecast integration.
- Shared wind/scent direction between participants.
- Persisting scent direction across app sessions.
- Adjustable wind strength/spread.
