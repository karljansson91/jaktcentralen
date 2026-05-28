# Fix Long-Press Bottom Sheet Presentation

Type: AFK

## What

Audit the long-press hunt action sheet and remove the strange grey top area/slide-in behavior. Use the recommended Expo/Expo Router sheet pattern for this case.

## Decisions

- Replace the custom React Native `Modal` with an Expo Router `formSheet`.
- Use `sheetAllowedDetents: 'fitToContents'`, native grabber, and native sheet animation.
- Long-press on the hunt map should open the sheet route with the selected
  coordinate.
- Pass the selected coordinate as URL params (`latitude`, `longitude`) so the
  sheet route is self-contained.
- Show a temporary marker/target at the selected map point while the sheet is
  open.
- Closing the sheet should return to the hunt map.
- Keep the same three actions; this issue is presentation-only.
- Keep the existing action subtitles for clarity.

## Done

- [ ] No odd grey area appears above the menu
- [ ] Sheet animation feels native
- [ ] Implementation follows Expo guidance for bottom sheets/modals
- [ ] Existing long-press actions still work unchanged
- [ ] Selected map point remains visually clear while the sheet is open
