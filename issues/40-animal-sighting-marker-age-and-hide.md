# Animal Sighting Marker Age And Hide

## Type

AFK - can start immediately once animal sighting data exists.

## Fresh Session Brief

Implement this issue independently after the planning pass is complete. If this touches Convex animal sighting acknowledgement state, read `convex/_generated/ai/guidelines.md` before changing backend code.

## What to build

When an animal is marked as seen, show the time above the map marker as a relative age such as "3 min ago". Users should be able to press the time/marker affordance to hide that sighting from their own live map without deleting it for others or from history.

## Current state

- `components/event/animal-sighting-layers.tsx` renders animal sighting circles and a text label using Mapbox `CircleLayer` and `SymbolLayer`.
- The current label is the animal name, for example `Älg`.
- Pressing a sighting currently opens an `Alert` with reporter details and a `Kvittera` action.
- `convex/animalSightings.ts` already supports per-user acknowledgement through `api.animalSightings.acknowledge`.
- `api.animalSightings.listVisible` hides acknowledged sightings for the current user.
- `api.animalSightings.listForReplay` still returns sightings for history replay, regardless of live acknowledgement.
- `useCurrentTime` already exists and can update relative time labels on a minute cadence.

## Locked decisions

- Live animal sighting labels should include both the animal label and relative age.
- Use short Swedish relative text: `Nu`, `1 min`, `2 min`, etc.
- A single-line label such as `Älg · 3 min` is acceptable and preferred if it is simpler with the current Mapbox symbol layer.
- Avoid English `ago` wording.
- Keep the existing marker tap entry point.
- Replace the current alert-style tap UI with an action menu/sheet.
- The action menu should include a clear action to hide the sighting from the current user's map, e.g. `Dölj på kartan`.
- Hiding should call the existing acknowledgement mutation rather than deleting the sighting.
- Hidden sightings do not need a restore UI in this issue.
- Hidden sightings remain available in chat/history/replay according to existing data flows.
- If the user never hides a sighting, keep it visible for the active hunt according to existing live visibility behavior.
- Do not add auto-expiry in this issue.
- Add a map options/tools menu action to toggle current animal sighting marker visibility on/off locally.
- The map options toggle hides or shows currently visible sighting markers for the current user only.
- New sightings should still appear even if the user previously toggled current sightings off.
- The all-sightings visibility toggle must not acknowledge/delete sightings and must not affect chat/history/replay.

## Planning questions to resolve

None - decisions are locked.

## Acceptance criteria

- [ ] Live animal sighting markers show a time/age label above the marker.
- [ ] The age label updates as minutes pass without requiring a full screen reload.
- [ ] Pressing the marker or age affordance hides the sighting for the current user according to the planned interaction.
- [ ] Pressing a sighting opens an action menu/sheet rather than the current alert.
- [ ] Hiding a sighting does not delete it globally.
- [ ] Other participants still see the sighting unless they hide it.
- [ ] Hidden sightings remain available in hunt history/replay according to existing sighting rules.
- [ ] Map options include a local toggle to hide/show current animal sighting markers.
- [ ] New sightings still appear after the user has toggled current sightings off.
- [ ] The map options visibility toggle does not acknowledge/delete sightings.

## Blocked by

- `19-hunt-animal-sighting-reports.md` for sighting data and acknowledgement behavior if not already implemented.

## Test plan

- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Run Convex codegen/check if acknowledgement APIs change.
- Test relative time formatting with deterministic timestamps.
- Verify hide/acknowledge behavior for two seeded users.
- Verify history replay still includes hidden live sightings.

## Out of scope

- Push notifications for sightings.
- Deleting or editing sightings.
- Sighting analytics or statistics.
