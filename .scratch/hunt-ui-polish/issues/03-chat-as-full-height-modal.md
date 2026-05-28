# Show Chat As Full-Height Modal

Type: AFK

## What

Change chat from full-screen navigation to a modal-style screen that matches the hunt info modal setup while still using full height.

## Decisions

- Use `presentation: 'modal'` and the same native header setup as hunt info.
- Use the native stack header instead of the custom in-screen `GlassScreenHeader`.
- Header title should be `Chat`.
- Do not add a custom X close button; follow the hunt info modal pattern.
- Keep `focusComposer=1` behavior so opening chat from the compose button focuses
  the input.
- Keep this issue scoped to chat modal/header presentation; message layout fixes
  belong in the chat message issue.

## Done

- [ ] Chat opens as a modal
- [ ] Chat still uses full available height
- [ ] Chat modal header matches hunt info style
- [ ] Composer autofocus still works when opened with `focusComposer=1`
