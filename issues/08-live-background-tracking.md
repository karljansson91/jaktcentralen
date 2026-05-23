# Live Background Tracking

## Fresh Session Brief
Implement this issue independently. Do not rely on prior chat context. This issue touches native Expo location configuration and Convex writes, so read `convex/_generated/ai/guidelines.md` before Convex changes and expect a new dev-client build after native config changes.

## Goal
Make participant tracking reliable enough for active hunts and later history replay, including background tracking, user-controlled sharing, and clear tracking status.

## User Story
As a hunt participant, I want my position to be shared during the hunt even if I briefly background the app, and I want a clear way to pause sharing. As other participants, we need to know whether a marker is live, stale, or paused.

## Current State
- Event map requests foreground location permission.
- Live positions update latest participant location.
- `positionTrails` exists in Convex, but the app does not consistently record replay history.
- There is no tracking-active indicator.
- There is no user-facing pause control.
- Background tracking is not configured as a complete product behavior.

## Desired Behavior
- Active hunts support background-capable tracking.
- The hunt map shows a clear indicator when location sharing/tracking is active.
- Users can turn tracking/location sharing off during a hunt.
- When tracking is paused, others see an indication rather than assuming the user is live.
- Paused/stale users appear grayed or dimmed, with status/last-seen shown in info.
- Tracking records history for replay:
  - Record when user moves at least 10 meters.
  - If stationary, record at most every 30 seconds.
- Tracking stops or becomes read-only when the hunt is archived.

## Likely Files And APIs
- `app.json` for background location permissions and platform config.
- `package.json` if `expo-task-manager` or another required dependency is missing.
- `app/(app)/event/[eventId]/index.tsx` for active map tracking UI.
- `convex/eventMembers.ts` for latest position and tracking status.
- `convex/positionTrails.ts` for replayable trail records.
- `convex/events.ts` for ended/archived hunt checks.
- `05-hunt-info-and-actions.md` consumes tracking status in the info screen.
- `06-hunt-ending-and-history-replay.md` consumes position trails for replay.

## Data Or API Changes
- Add enough event member state to distinguish tracking states. Recommended fields:
  - `trackingStatus`: `active`, `paused`, or `stale` if persisted.
  - `trackingPausedAt`.
  - `lastSeenAt` should continue to represent last successful shared location.
- Add a mutation to pause/resume tracking for the current user in an event.
- Use `positionTrails.record` or an updated equivalent to store replay points.
- Block tracking writes when the event is ended/archived.
- Use a stale threshold in UI. Recommended default: dim markers when `lastSeenAt` is older than 2 minutes or when tracking is paused.

## Native And Permission Notes
- Background tracking requires native configuration and a rebuilt dev client.
- iOS will need appropriate location permission copy and background location mode if true background updates are enabled.
- Android will need appropriate location permissions and foreground/background behavior.
- Permission text should clearly explain that location is used to share position with hunt participants during active hunts.

## Implementation Outline
- Add or verify native dependencies and config for Expo background location.
- Create a tracking controller/hook that can run foreground and background updates for the active hunt.
- Add current-user tracking indicator and pause/resume control on the hunt map.
- Persist enough active tracking context for background updates to know which event to update.
- Record latest position and trail points using the 10-meter/30-second rule.
- Update member marker rendering to dim paused/stale participants.
- Update hunt info to display paused/stale/last-seen details.
- Stop location updates and writes when the user leaves or the hunt ends.

## Acceptance Criteria
- App requests the necessary permissions for background tracking on supported platforms.
- Active hunt map shows tracking active/inactive state for the current user.
- User can pause and resume sharing.
- Other participants can see that tracking is paused or stale.
- Stale positions are dimmed and include last-seen context where displayed.
- Position trails are recorded for replay.
- Recording respects the 10-meter movement and 30-second stationary rule.
- Tracking does not continue writing live updates after hunt archive/end.
- A new dev-client build is documented or performed when native config changes require it.

## Test Plan
- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Run `npx expo-doctor@latest` if Expo/native config or dependencies change.
- If Convex schema/functions changed, run the project's Convex codegen/check workflow.
- Add deterministic unit tests for the tracking throttle logic using fake coordinates and fake timers.
- Verify no trail point is recorded before the 10-meter movement threshold unless the 30-second stationary interval has elapsed.
- Verify a trail point is recorded after moving more than 10 meters.
- Verify stationary recording happens at most every 30 seconds.
- Add or extend Convex tests for pause/resume tracking status using seeded event member data.
- Verify paused users do not write active location updates until resumed.
- Verify stale/paused marker state can be derived from seeded `lastSeenAt` and pause fields.
- Verify tracking writes are rejected or ignored after hunt archive/end using seeded ended-event data.
- If native background tracking is configured, verify config statically and run dev-client/simulator checks only when an existing simulator/dev session is available; do not require manual sign-in.
- If simulator location automation exists, use scripted/fake location updates instead of manual movement.

## Dependencies
- Hunt archive behavior is specified in `06-hunt-ending-and-history-replay.md`.
- Hunt info display is specified in `05-hunt-info-and-actions.md`.

## Out Of Scope
- Detailed battery optimization UI.
- Geofencing alerts.
- Push notifications.
- Exporting location data.
