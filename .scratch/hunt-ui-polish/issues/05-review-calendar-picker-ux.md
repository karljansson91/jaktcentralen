# Review Calendar Picker UX

Type: HITL

## What

Check whether the current calendar bottom modal is the right Expo UI pattern. Simplify it if the standard native date picker is better.

## Decisions

- Replace the custom iOS calendar React Native `Modal` with Expo UI/native
  `DateTimePicker` where possible.
- Keep date picking lightweight; selecting hunt dates does not need a full custom
  calendar bottom sheet.
- Use the same date picker pattern for create hunt and hunt info/admin date
  editing.
- Apply selected dates immediately when the native picker returns a value.
- Delete the custom `EventDatePickerSheet` and calendar-only helpers if the
  native picker fully replaces them.

## Done

- [ ] Decide preferred date picker pattern
- [ ] Date selection feels native and lightweight
- [ ] Create/edit/info date fields use the same pattern
- [ ] Date selection applies immediately
- [ ] Unused custom calendar sheet code is removed
