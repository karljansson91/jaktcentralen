# Area More Sheet Padding

## Fresh Session Brief
Implement this issue independently. Do not rely on prior chat context. This is a visual/layout cleanup for the area more/options sheet only.

## Goal
Make the area more/options bottom view follow the same screen padding, safe-area rhythm, and rounded sheet feel as the area screen and other modal/sheet surfaces.

## User Story
As an area owner opening the area more menu, I want the bottom sheet content to feel aligned with the app's screen edges and corner radius, so the menu feels like a first-class part of the area experience.

## Current State
- Main route: `app/(app)/area/[id]/actions.tsx`.
- Sheet registration: `app/(app)/area/[id]/_layout.tsx`.
- The sheet uses `presentation: 'formSheet'` with `sheetCornerRadius: 28`.
- The content currently uses its own padding and background handling.
- The visual complaint is that the bottom view does not follow the screen paddings/radius and feels different from the area view.

## Desired Behavior
- Area more sheet content respects the sheet's rounded top corners and does not visually bleed to the edges.
- Horizontal padding matches the app's area/map overlay rhythm, especially the `left-4 right-4` convention used around area controls.
- Bottom padding uses `Math.max(insets.bottom, 16)` or the local sheet standard so the last action does not sit on the home indicator.
- The action group has a tidy contained width and spacing that looks intentional on small and large phones.
- The sheet background and route `contentStyle` match `APP_COLORS.background`.

## Likely Files And APIs
- `app/(app)/area/[id]/actions.tsx` for the sheet layout.
- `app/(app)/area/[id]/_layout.tsx` for form sheet presentation options.
- `lib/theme.ts` for `APP_COLORS`.
- Existing UI primitives in `components/ui` and `components/glass` if needed.

## Data Or API Changes
- None.

## Implementation Outline
- Audit the existing area screen and other form sheets for spacing/radius conventions.
- Refactor the area actions root container so it uses a single, predictable content inset model.
- Avoid nested card-like containers unless a repeated item genuinely needs a framed surface.
- Keep action buttons stable in height and prevent long labels from resizing the sheet unexpectedly.
- Confirm the sheet looks correct with the reduced action list after `14-remove-area-more-view-hunts.md`.

## Acceptance Criteria
- The area more sheet content aligns with the app's normal side padding.
- The sheet respects safe-area bottom padding.
- The sheet background follows the rounded form sheet and does not look square or edge-to-edge inside the rounded host.
- Action button labels fit without clipping on narrow screens.
- The sheet still uses `fitToContents` or an equivalent compact detent.
- Existing actions still navigate or execute correctly, except actions removed by separate issues.

## Test Plan
- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Use a simulator or in-app browser/native preview fixture to open `/area/[id]/actions` on a seeded area.
- Capture or inspect at least one narrow phone viewport and one larger viewport.
- Verify the first and last actions align to the same horizontal padding.
- Verify the last action clears the home indicator/safe area.
- Verify the sheet rounded corners remain visible and visually clean.

## Dependencies
- Pairs naturally with `14-remove-area-more-view-hunts.md`, but can be implemented before or after it.

## Out Of Scope
- Changing area map behavior.
- Reordering area actions beyond what is needed for spacing.
- Rebuilding the sheet as a custom bottom sheet library.
