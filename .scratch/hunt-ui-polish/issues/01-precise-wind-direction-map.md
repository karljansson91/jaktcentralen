# Precise Wind Direction With Map Context

Type: AFK

## What

Keep the current N/S/E/W labels, but let hunters set wind direction by exact degrees. Show the hunt map and points behind/alongside the picker so direction is easier to understand.

## Decisions

- Keep wind direction local to the current user/session for now.
- Use a separate clean modal/sheet screen, not the live hunt map UI.
- Show area boundary and area markers/pass points, similar to the area map view.
- Do not show assigned hunter positions.
- Show current GPS location when available.
- Use a compass-style degree picker over the map, not numeric input alone.
- Preview changes live, but only apply them when tapping `Klar`.
- `Avbryt` keeps the previous direction unchanged.
- Include `Rensa` in the wind screen when wind is already set.
- Remove the separate `Rensa vindriktning` option from the hunt tools menu.
- If no wind is set, open with a neutral `N 0°` preview but do not apply it
  until `Klar`.

## Implementation notes

- Current wind selection is local app state in the hunt map screen.
- `lib/wind-direction-selection.ts` publishes selected degrees today; keep that
  local-only contract for this issue.
- The existing scent plume already draws opposite the wind source direction.

## Done

- [ ] Direction can be set at degree precision
- [ ] Cardinal labels still show
- [ ] Hunt map context is visible
- [ ] Screen uses the same near-full modal style as hunt info
- [ ] Existing wind can be cleared from the wind screen
- [ ] Hunt tools menu no longer has a separate clear-wind option
