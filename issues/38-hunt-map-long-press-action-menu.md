# Hunt Map Long Press Action Menu

## Type

AFK - blocked by animal sighting picker presentation if not already implemented.

## Fresh Session Brief

Implement this issue independently after the planning pass is complete. If this touches animal sightings, chat/system messages, or Convex data, read `convex/_generated/ai/guidelines.md` before changing backend code.

## What to build

When a participant long-presses the active hunt map, open a context action menu instead of jumping directly into a single action. The menu should let the user choose between measuring distance to the pressed point, adding a point to measure distance between points, or marking what animal they have seen.

## Current state

- `app/(app)/event/[eventId]/index.tsx` currently handles active-hunt map long-press by immediately setting `pendingAnimalSighting`.
- The current flow opens `AnimalSightingPicker` directly from the pressed coordinate.
- `lib/geo.ts` already exports `distanceMeters`.
- `lib/hunt-navigation.ts` already exports `formatTrailDistance`, which should be reused for meter/km labels.
- There is no existing persistent measurement backend; measurement should remain local-only unless explicitly planned otherwise.
- `components/DraggableAreaPointMarkers.tsx` and `hooks/use-area-marker-gestures.ts` show the existing drag interaction style for area/tower point markers.
- `components/event/assignment-route-layer.tsx` already renders a route line with direct-mode dashed styling.

## Locked decisions

- Long-press should open a bottom-sheet/form-sheet style action chooser, not a tiny anchored/native context menu.
- The action chooser should show three clear actions:
  - `Mät avstånd hit`
  - `Lägg till mätpunkt`
  - `Markera observation`
- The sheet should be easy to hit on a phone map and should avoid the current rough menu feel.
- `Mät avstånd hit` measures from the current user position to the long-pressed point.
- If no current user coordinate is available, show `Plats saknas` and do not create a measurement.
- Measurement is local-only and must not write to Convex.
- Measurement should support toggling between direct bird-path distance and walking route/way-there distance.
- Reuse or generalize the existing assignment route concepts where practical: direct route, walking route, map line layer, title-area route summary, loading/error states, and `formatTrailDistance`.
- The active measurement route mode should be visible/toggleable in the hunt map title/top-nav area.
- When measurement mode is active, replace the bottom-left hunt map tools/menu button with an `X` clear button.
- Pressing the `X` clears the active measurement and restores the normal hunt map tools/menu button.
- Do not add an additional floating clear button while measurement is active.
- `Lägg till mätpunkt` should add local-only measurement waypoints, not persisted records.
- Users may place multiple measurement points, not just two.
- Measurement points should be draggable using an interaction similar to existing tower/area point markers.
- Dragging a measurement point updates the local measurement route/distance.
- The `X` clear button clears all local measurement points and measurement route state.
- Treat multiple measurement points as an ordered route: A to B to C to D.
- Show the total distance through all active measurement points in the title/top-nav summary.
- Do not add per-segment distance labels in v1 because they would clutter the hunt map.
- `Markera observation` should reuse the existing animal sighting creation flow for the long-pressed coordinate.
- The animal picker itself should be a bottom sheet as planned in `39-animal-sighting-bottom-sheet-picker.md`.
- This issue should trigger the sighting picker branch, but should not redesign the animal picker beyond the dependency on issue 39.

## Planning questions to resolve

None - decisions are locked.

## Acceptance criteria

- [ ] Long-pressing the active hunt map opens an action menu at or for the pressed coordinate.
- [ ] The menu includes an action to measure distance from the user/current reference to the pressed point.
- [ ] Measuring distance from the user supports both direct bird-path and walking-route modes.
- [ ] The active measurement mode/distance is visible in the title/top-nav area and can be toggled there.
- [ ] The menu includes an action to add a measurement point so the user can measure distance between selected points.
- [ ] Users can place multiple local measurement points.
- [ ] Users can drag local measurement points and the displayed measurement updates.
- [ ] Multi-point measurement shows total ordered-route distance, not per-segment map labels.
- [ ] The menu includes an action to mark an animal sighting using the current sighting flow.
- [ ] Measurement UI can be cleared or replaced without leaving stale map clutter.
- [ ] While measurement is active, the normal map tools button is replaced by an `X` clear button.
- [ ] Clearing measurement restores the normal map tools button.
- [ ] The long-press menu is not available in ended hunt/history replay mode unless explicitly planned.

## Blocked by

- `19-hunt-animal-sighting-reports.md` for the animal sighting creation path if that path is not already implemented.
- `39-animal-sighting-bottom-sheet-picker.md` if this issue is implemented after the current rough picker still exists and the branch must open the new bottom sheet.

## Test plan

- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Run Convex codegen/check if any backend sighting APIs change.
- Verify long-press opens the menu and each action receives the pressed coordinate.
- Verify distance output with deterministic coordinate fixtures.
- Verify clearing/replacing measurement points.
- Verify the sighting branch still creates the expected marker/chat behavior.

## Out of scope

- Persistent saved measurement history.
- Sharing measurement points with other participants.
- Full drive/såtar planning tools.
