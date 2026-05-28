# Move Map Style Picker To Bottom Sheet

Type: AFK

## What

Make “Ändra kartvy” use a bottom modal/sheet with flexible height based on its content.

Use one shared Expo Router sheet route for map style selection. Area map and hunt map should both open this sheet instead of the current alert picker.

Selecting a map style should save/apply immediately and close the sheet. Do not add a separate save action.

Use Expo Router/native sheet presentation, ideally `formSheet` with content-height/fit-to-content detents and native grabber. Avoid a custom React Native `Modal` for this picker.

Show only the map style names. Do not include descriptions in the sheet.

## Done

- [ ] Map style picker opens as a bottom sheet/modal
- [ ] Area map and hunt map use the same picker route
- [ ] Sheet uses native presentation with content-height sizing
- [ ] Selection still updates the map immediately
- [ ] Selecting a style closes the sheet
- [ ] Sheet shows only style names
