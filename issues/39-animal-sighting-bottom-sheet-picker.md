# Animal Sighting Bottom Sheet Picker

## Type

AFK - can start immediately once sighting creation exists.

## Fresh Session Brief

Implement this issue independently after the planning pass is complete. This is a UI replacement for the animal sighting picker used during active hunts.

## What to build

Replace the current animal sighting picker menu with a polished bottom slide/half-screen sheet. The sheet should let the user select the animal they saw from the pressed hunt-map coordinate and should feel consistent with the app's other modal/sheet surfaces.

## Current state

- `components/event/animal-sighting-picker.tsx` currently renders an absolutely positioned glass panel over the map.
- `app/(app)/event/[eventId]/index.tsx` shows that panel when `pendingAnimalSighting` is set.
- Existing route sheets, such as area marker sheets, use Expo Router/React Navigation `formSheet` presentation.

## Locked decisions

- Implement the animal sighting picker as an Expo Router sheet route, not as a hand-rolled absolute map overlay.
- Use Expo Router/React Navigation `formSheet` or the closest platform sheet presentation.
- The sheet should open from the hunt map with the pressed coordinate available to the sheet.
- Dismissing/cancelling the sheet must not create a sighting.
- Pass the long-pressed coordinate to the sheet via route params such as `latitude` and `longitude`.
- Route params are temporary sheet input only, not the source of truth.
- Selecting an animal saves the sighting to Convex through the existing animal sighting report mutation.
- After Convex saves the sighting, the hunt map should update from its existing `listVisible` subscription/query rather than manual marker injection.
- Keep the existing animal options and order for this issue: `Älg`, `Rådjur`, `Vildsvin`, `Räv`, `Annat`.
- Do not add animal search, recent choices, or taxonomy expansion in this issue.
- Sheet title should be `Vad såg du?`.
- Because this is not full-screen, do not add a close button inside the sheet content.
- Rely on the platform sheet dismiss gesture/back behavior for cancellation.
- Selecting an animal disables controls while saving, writes to Convex, and dismisses on success.

## Planning questions to resolve

None - decisions are locked.

## Acceptance criteria

- [ ] The animal picker opens as a bottom slide/half-screen sheet rather than the current rough menu.
- [ ] The picker is implemented as an Expo Router sheet route.
- [ ] The sheet title is `Vad såg du?`.
- [ ] The sheet shows a clear list of sighting animal options.
- [ ] Selecting an animal creates the sighting at the pressed coordinate.
- [ ] Cancelling/dismissing the sheet does not create a sighting.
- [ ] The sheet does not add an in-content close button.
- [ ] The sheet respects safe areas and does not overlap critical map controls.
- [ ] The keyboard does not open when choosing an animal from the sheet.

## Blocked by

- `19-hunt-animal-sighting-reports.md` for sighting creation if it is not already implemented.

## Test plan

- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Verify long-press or the chosen trigger opens the sheet.
- Verify selection, cancellation, dismissal, and repeated openings.
- Verify narrow phone layout and safe-area behavior.
- Verify created sightings still appear in map and chat.

## Out of scope

- Changing sighting persistence semantics.
- Adding photos or notes to sightings.
- Reworking all app sheets.
