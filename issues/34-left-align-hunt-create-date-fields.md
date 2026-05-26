# Left Align Hunt Create Date Fields

## Type

AFK - can start immediately.

## Fresh Session Brief

Implement this issue independently after the planning pass is complete. This is a create-hunt UI alignment fix and should not require backend changes.

## What to build

Left-align the date/time values and placeholders in the create-hunt flow so date fields read naturally with the surrounding form content. The fix should apply to the hunt creation date controls without disturbing picker behavior.

## Current state

- `components/event/event-date-picker-field.tsx` wraps Expo UI `DateTimePicker`.
- The component is currently used for the create-hunt `Startdatum` and `Slutdatum` fields.
- There are no separate time fields in the current create-hunt flow.

## Locked decisions

- Scope this issue only to the existing create-hunt `Startdatum` and `Slutdatum` fields.
- Keep the same date picker behavior, mode, values, validation, and data model as today.
- This is a styling-only issue.
- Apply the alignment fix in `EventDatePickerField` so both create-hunt date fields stay consistent.
- Avoid screen-level one-off wrappers unless Expo UI requires them.
- Keep labels in their current form-label position.
- Left-align only the compact date picker value/placeholder/control content so it matches surrounding inputs.
- Do not redesign the date section layout.

## Planning questions to resolve

None - decisions are locked.

## Acceptance criteria

- [ ] Create-hunt date field labels remain aligned with the rest of the form.
- [ ] Date/time placeholders are left-aligned.
- [ ] Selected date/time values are left-aligned.
- [ ] Picker opening, selection, clearing, and validation behavior remains unchanged.
- [ ] The alignment works on narrow phone screens without clipping text.

## Blocked by

None - can start immediately.

## Test plan

- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Verify create hunt before selecting dates, after selecting dates, and after validation errors.
- Verify the same component in any other route if the shared component is changed.

## Out of scope

- Changing hunt date validation.
- Redesigning the create-hunt form.
- Adding recurring hunt dates.
