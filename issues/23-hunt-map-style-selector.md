# Shared Swedish Map Style Selector

## Parent

GitHub issue #5: A couple things from the new build.

## Type

AFK - can start immediately.

## Fresh Session Brief

Implement this issue independently. Do not rely on prior chat context. This is a UI/settings slice for map style selection. It should reuse the existing map style utility and avoid introducing per-hunt map style state.

## What to build

Make the existing map style picker available from the hunt `...` actions sheet and simplify the shared map style options across the app to a Swedish-labeled three-style list: standard, terrain/outdoor, and satellite.

## Locked Decisions

- Map style remains one global saved preference shared by area and hunt maps.
- Do not add per-hunt or per-area map style preferences.
- Use the existing map style storage/subscription mechanism.
- Limit the shared selectable style list everywhere to:
  - `Standard`
  - `Terräng`
  - `Satellit`
- The hunt map style control belongs in the existing `...` actions sheet, not as a floating map button.
- The action sheet row label should be `Ändra kartvy`.
- Reuse the current native `Alert` option-list pattern for this slice.

## Acceptance criteria

- [ ] Hunt `...` actions include an `Ändra kartvy` action.
- [ ] Tapping `Ändra kartvy` opens the existing/native style option list pattern.
- [ ] Only `Standard`, `Terräng`, and `Satellit` are selectable.
- [ ] Map style option labels are Swedish across both area and hunt map style pickers.
- [ ] Selecting a style updates the currently visible hunt map without leaving the hunt screen.
- [ ] Selecting a style still persists globally and affects area maps and hunt maps consistently.
- [ ] No per-hunt map style schema/API/state is introduced.

## Blocked by

None - can start immediately.

## Test plan

- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Use the running simulator or `localhost:3200` view to open a hunt map, open `...`, select each map style, and verify the map changes.
- Open an area map/actions flow and verify the same three Swedish options are used.
- Verify a saved style is loaded after navigating away and back.
- Verify the hunt action sheet row says exactly `Ändra kartvy`.
- Run the repo-local thermo-nuclear code quality review before committing implementation changes.

## Out of scope

- Custom bottom-sheet picker UI.
- Per-hunt map style memory.
- Additional Mapbox styles beyond the three locked options.
