# Make Delete Area Navigate Back

Type: AFK

## What

After deleting an area, the transition should feel like returning to the main menu, not navigating forward.

## Decisions

- After successful delete, call `back()` when the area screen has a back stack.
- Fall back to `replace('/')` only when there is no route to go back to.
- Keep the existing soft-delete backend behavior unchanged.
- Shorten the confirmation copy. Ask only if the user is sure they want to
  delete the area.
- Keep the destructive confirmation button text as `Ta bort område`.

## Done

- [ ] Delete success returns to main menu/home
- [ ] Navigation animation feels like going back
- [ ] Deleted area is not visible after returning
- [ ] Delete confirmation copy is short and direct
