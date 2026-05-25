# Issue PRD Index

These docs are intended for fresh implementation sessions. Each issue should be readable without the original planning conversation.

Before implementing any issue:
- Read `AGENTS.md`.
- If touching Convex code, read `convex/_generated/ai/guidelines.md` first.
- Check `git status` before editing because this repo may already contain unrelated work.
- Keep feature work scoped to the selected issue unless the issue explicitly lists a dependency that must be completed first.

## Automation-Safe Verification Standard
These issue test plans must be runnable by Codex without human supervision.

- Do not require creating real email accounts, receiving verification emails, or manually signing up users.
- For multi-user behavior, use deterministic fixtures, mocked Clerk/Convex identities, Convex tests, or a local seed script.
- If the repo does not yet have a suitable test harness for the changed layer, adding a minimal deterministic harness is part of that issue.
- Simulator or in-app browser checks are allowed only when they can use an existing logged-in simulator/dev fixture or local shim; they should not require manual account creation.
- Manual visual checks may be replaced by Codex-run screenshots/browser inspection when the simulator is available.
- Every issue should still run `npm run lint` and `npx tsc --noEmit`; add `npx expo-doctor@latest` when native dependencies or Expo config change.

## Issues
- `01-home-dashboard-polish.md`: start page cleanup, join CTA, area CTA, empty states.
- `02-profile-account-hub.md`: profile route, Clerk account UI, logout, badge entry point.
- `03-friends-and-invite-inbox.md`: friends management, user search, friend requests, hunt invite inbox.
- `04-hunt-create-invite-share-code.md`: join-code suggestions, creator-only invite/share, `Bjud in fler`.
- `05-hunt-info-and-actions.md`: hunt more menu, info screen, creator-only participant/admin actions.
- `06-hunt-ending-and-history-replay.md`: archive ended hunts, history section, replay map, read-only chat.
- `07-station-assignment-and-marker-media.md`: assign participants to point markers, restore marker images.
- `08-live-background-tracking.md`: background-capable tracking, pause/resume, stale state, trail recording.
- `09-hide-current-user-map-label.md`: hide the current user's map initials/name overlay and rely on the blue location indicator.
- `10-area-more-sheet-padding.md`: align the area more sheet with app padding, safe areas, and rounded sheet styling.
- `11-chat-keyboard-composer.md`: fix chat keyboard/composer behavior with a proven keyboard package and chat-template-inspired layout.
- `12-homepage-visual-refresh.md`: redesign the authenticated homepage so it feels polished and uniform with area/hunt pages.
- `13-marker-image-upload-fix.md`: repair marker image upload, persistence, display, and removal.
- `14-remove-area-more-view-hunts.md`: remove `Visa jakter` from area more options.
- `15-remove-manage-markers-from-update-info.md`: remove `Hantera markörer` from the update-info form.
- `16-area-update-info-modal.md`: make area update-info use a modal presentation consistent with other flows.
- `17-auto-end-past-hunts.md`: automatically treat hunts as ended when their end date has passed.
- `18-chat-unread-indicator.md`: show unread chat message counts when other participants send messages.
- `19-hunt-animal-sighting-reports.md`: long-press hunt map to report animal sightings, mirror them to chat, acknowledge live markers, and replay them in history.
- `21-friend-search-email-phone.md`: editable app profile fields and friend search by name, email, and phone using Convex app-profile search.
- `22-home-upcoming-hunts-and-history-access.md`: keep current/future hunts visible by default and tuck ended hunts under an animated `Avslutade` toggle.
- `23-hunt-map-style-selector.md`: expose the shared Swedish map style selector from hunt actions and limit selectable styles to standard, terrain, and satellite.
- `24a-typed-hunt-system-messages.md`: add typed chat/system messages and refactor animal sighting messages onto that foundation.
- `24b-hunt-marker-visual-clarity.md`: make live position markers and assigned destination pins visually distinct.
- `24c-hunt-in-position-status.md`: sync self-reported in-position status, readiness count, prompts, and chat messages.
- `24d-hunt-map-tools-menu-and-position-sharing.md`: replace map controls with an anchored native menu and add visibility/sharing toggles.
- `26-hunt-allowed-game-rules.md`: define allowed game for a hunt with structured species options, title/home hints, popup details, and hunt info display.
- `29-local-scent-plume-indicator.md`: add a local-only active hunt scent plume set by swipe and cleared from the map tools menu.

Note: `20-chat-sheet-height-and-latest-message-visibility.md` was triaged as no longer needed and intentionally not created.
Note: `25-hunt-drive-planning-and-pass-selection.md` needs more domain clarification and is intentionally deferred.
Note: `27-crosshair-map-item-placement.md` is intentionally deferred for now.
Note: `28-map-distance-measurement.md` is intentionally deferred for now.

## Product Decisions Already Made
- Areas remain owner-only for editing.
- Creating a hunt remains area-first.
- Hunt admin actions are creator-only.
- Ending a hunt should archive it, not delete it.
- Ended hunts should appear in a separate `Historik` section.
- Tracking should be pausable and visibly stale/paused to others.
