# Allowed Game Picker Keyboard Focus

## Type

Deferred - skipped for now.

## Fresh Session Brief

Do not implement this issue unless it is explicitly reopened. This issue was created from an initial planning list but was skipped during grill-me planning.

## What to build

Prevent the keyboard from opening when the user is only selecting an animal/species to hunt. The keyboard should appear only when the user intentionally focuses a free-text field such as custom `Annat` or a note.

## Current state

- `components/event/allowed-game-editor.tsx` renders species rows as pressable checkbox-style rows.
- Selecting a normal species immediately reveals subgroup chips and an always-visible note `Input`.
- The `Annat` section has a `Lägg till` button that immediately creates a custom row with text `Input` fields for custom label and note.
- No `autoFocus` prop is present, so the likely issue is that free-text inputs appear directly in the selection flow and can receive focus during normal animal selection.

## Locked decisions

- Skip this issue for now.
- Do not change allowed-game keyboard focus behavior as part of this planning batch.

## Planning questions to resolve

None - intentionally deferred.

## Acceptance criteria

- [ ] Opening the allowed-game picker does not open the keyboard.
- [ ] Selecting a normal animal/species does not open the keyboard.
- [ ] Selecting subgroup chips does not open the keyboard.
- [ ] The keyboard opens only for explicit free-text input.
- [ ] Existing allowed-game selections still save and render correctly.
- [ ] Keyboard dismissal does not lose selected animals.

## Blocked by

Deferred - do not start until reopened.

## Test plan

- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Verify hunt creation and allowed-game editing flows in simulator.
- Test normal species, subgroup chips, `Annat`, and note editing.
- Verify Android and iOS behavior if both are available.

## Out of scope

- Changing the allowed-game taxonomy.
- Removing custom species or notes.
- Redesigning the whole hunt creation flow.
