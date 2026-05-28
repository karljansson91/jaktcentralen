# Add Pass Position Prompt Ignore Options

Type: AFK

## What

When the pass position prompt appears repeatedly, keep the alert simple: `Ignorera` plus the affirmative action. Ignoring means ignore forever for that hunt assignment.

Apply this to both "you are at your pass" and "you left your pass" prompts where repeated prompts can annoy. The near-pass prompt should offer `Ignorera` and `Markera på plats`. The left-pass prompt should offer `Ignorera` and `Ta bort från pass`.

`Ignorera` is scoped per hunt assignment, not global. If the user manually marks themselves on pass or removes their on-pass status, reset the ignore state for that hunt assignment.

Store ignore state locally on the device, persisted across app restarts. Do not add Convex schema or shared state for this issue.

`Ignorera` should behave like the cancel/dismiss action and store the ignore. `Ta bort från pass` should be destructive. `Markera på plats` should be the positive action.

`Ta bort från pass` only clears the user's current on-pass/in-position status. It must not unassign the user from the pass.

Use the existing alert button roles: `Ignorera` should be cancel-style, `Ta bort från pass` should be destructive, and `Markera på plats` should be the normal affirmative action.

## Done

- [ ] Prompts include `Ignorera`
- [ ] Near-pass prompt includes `Markera på plats`
- [ ] Left-pass prompt includes remove my location from pass
- [ ] Ignored prompts do not keep reappearing unexpectedly
- [ ] Ignore is per hunt assignment and resets after manual mark/remove
- [ ] Ignore state is local and persisted on the device
- [ ] Alert action styles match intent
- [ ] Removing from pass clears in-position status without changing assignment
