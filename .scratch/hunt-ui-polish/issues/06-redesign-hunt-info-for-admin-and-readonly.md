# Redesign Hunt Info For Admin And Read-Only Users

Type: AFK

## What

Make hunt info look like the create hunt form for admins, and read-only for non-admins. For read-only users, allowed game should simply show what is allowed; do not add a dropdown, accordion, modal, or extra tap interaction.

Admin info should be a real edit form for the core hunt fields: title, description, start date, end date, join code, and allowed game. For this issue, "admin" means the hunt creator only; do not introduce area-admin roles or new role logic. Keep invite and participants as separate sections below the form.

Use an explicit `Spara` action for the admin form. Field changes, including date picker selections, should stay local until the creator taps save.

Place `Spara` in the same bottom action area style as create hunt. Do not put save in the native header.

The creator can edit ended, ongoing, and upcoming hunts from info. Do not block allowed game or date corrections just because the hunt has ended.

For non-creators, keep the same visual family as the form but do not render disabled inputs. Show readable text rows, dates, and tags.

For the creator, reuse the existing create-hunt `Tillåtet vilt` editor inline to avoid a second editing model. For non-creators, show the allowed animals plainly as text/tags.

## Done

- [ ] Admin info screen matches create hunt form style
- [ ] Hunt creator can edit title, description, dates, join code, and allowed game from info
- [ ] Creator can edit ended, ongoing, and upcoming hunts
- [ ] Hunt changes are saved only after tapping `Spara`
- [ ] `Spara` uses create-hunt bottom action style, not header action
- [ ] Non-admin view is read-only without disabled input fields
- [ ] Read-only allowed game plainly shows what is allowed
- [ ] Creator allowed-game editing reuses the existing create-hunt editor
- [ ] Invite friends stays on info below the hunt details form, creator-only
- [ ] Participant list stays on info below hunt details and invite section
