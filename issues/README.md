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

## Product Decisions Already Made
- Areas remain owner-only for editing.
- Creating a hunt remains area-first.
- Hunt admin actions are creator-only.
- Ending a hunt should archive it, not delete it.
- Ended hunts should appear in a separate `Historik` section.
- Tracking should be pausable and visibly stale/paused to others.
