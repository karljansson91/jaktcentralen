# Hunt Map Tools Menu And Position Sharing

## Parent

GitHub issue #5: A couple things from the new build.

## Type

AFK - blocked by `24c-hunt-in-position-status.md` for in-position actions.

## Fresh Session Brief

Implement this issue independently. Do not rely on prior chat context. This issue changes active hunt map controls, local display preferences, and Convex live tracking state. Read `AGENTS.md` and `convex/_generated/ai/guidelines.md` before changing Convex code.

## What to build

Replace the current bottom-left hunt map floating controls with one anchored native map tools menu. The menu should use Expo's drop-in native `MenuView`, include location/route/status controls, and support hiding other users locally plus disabling the current user's shared position updates.

## Locked Decisions

- Use `MenuView` from `@expo/ui/community/menu` as documented in Expo's drop-in Menu docs.
- Use tap trigger, not long-press.
- One single floating map tools button lives bottom-left.
- The menu opens from the trigger button using native anchored menu behavior.
- The menu replaces both current bottom-left route/navigation and locate buttons.
- Keep map style selection out of this menu; map style remains under hunt `...` actions.
- Menu actions should include:
  - locate me
  - show route to assigned pass, when applicable
  - toggle other users' position visibility
  - toggle own position sharing
  - mark/clear myself in position, when applicable
- Hide other users' positions is local-only user display state and does not hide assignment pins.
- Own position sharing defaults active.
- Store a Convex disable flag for own position sharing on the user's hunt/member tracking state.
- When own sharing is disabled, stop writing new live/trail location updates to Convex.
- Other participants still see the user's last known position, clearly marked offline/not live.
- Users can mark themselves in position even when sharing is disabled.
- The menu is active-hunt only.

## Acceptance criteria

- [ ] Active hunt map has one bottom-left floating map tools button.
- [ ] Tapping the button opens a native anchored menu from `@expo/ui/community/menu`.
- [ ] `Locate me` recenters the map from the menu.
- [ ] `Visa väg till pass` remains available from the menu when the user has an assigned pass.
- [ ] The user can locally hide/show other users' live/last-known position markers without hiding assignment pins.
- [ ] The user can disable/enable their own position sharing.
- [ ] Disabling own position sharing stops new live/trail writes to Convex.
- [ ] Other participants see the user's last known marker as offline/not live while sharing is disabled.
- [ ] Position sharing defaults active for active hunt participants.
- [ ] The menu is not shown for ended hunts/history replay.

## Blocked by

- `24c-hunt-in-position-status.md`

## Test plan

- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Run the project's Convex codegen/check workflow if schema/functions change.
- Use simulator or `localhost:3200` to verify the native anchored menu opens from the bottom-left trigger.
- Verify menu action toggles show checkmark/on-off state where appropriate.
- Verify hide-other-users affects only the current viewer and keeps assignment pins visible.
- Add deterministic Convex tests for position-sharing disable flag and blocked/ignored location writes while disabled.
- Verify last known offline marker rendering with seeded member state.
- Verify route-to-pass and locate-me actions still work from the menu.
- Run the repo-local thermo-nuclear code quality review before committing implementation changes.

## Out of scope

- Custom liquid-glass popover implementation.
- Map style selection.
- Drive/såtar controls.
- Background tracking redesign beyond honoring the sharing disable flag.
