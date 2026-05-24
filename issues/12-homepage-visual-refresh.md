# Homepage Visual Refresh

## Fresh Session Brief
Implement this issue independently. Do not rely on prior chat context. This issue is a product/design pass on the authenticated homepage. It should not expand backend scope. If any Convex code is touched, read `convex/_generated/ai/guidelines.md` first.

## Goal
Give the homepage a stronger, more polished design while keeping it visually uniform with the rest of the app's area, hunt, glass, and map surfaces.

## User Story
As a user opening the app, I want the homepage to feel like the same product as the map and area pages, with clear next actions and a calm outdoor/hunting tone, so it feels trustworthy and easy to act from.

## Current State
- Main route: `app/(app)/index.tsx`.
- Earlier home cleanup is documented in `01-home-dashboard-polish.md`.
- The current home screen has hunt and area sections, profile/inbox button, empty states, and list cards.
- The current design is reported as not good enough and needs a more intentional visual pass.
- Other app screens use `APP_COLORS`, glass floating controls, Mapbox map views, rounded sheets, restrained green accents, and compact tool-like navigation.

## Desired Behavior
- The homepage should feel designed for this app, not like a generic dashboard.
- Preserve the functional shape:
  - profile/account entry with badge readiness;
  - `Mina jakter` with join action;
  - `Mina områden` with create-area action;
  - populated and empty states;
  - ended hunt visibility if already supported.
- Use a clear aesthetic direction aligned with the product: refined outdoor utility, quiet field log, map-first hunting companion, or another intentional direction that matches existing pages.
- Use the linked frontend-design skill as design guidance: make a deliberate aesthetic choice, refine typography/color/spacing/motion, avoid generic AI-looking layouts, and keep implementation production-grade.
- Pull the feel from existing app surfaces:
  - `APP_COLORS.background`, `APP_COLORS.primary`, `APP_COLORS.surface`, border color;
  - glass controls where appropriate;
  - map/area language and compact scannable actions;
  - no loud marketing hero.
- The first screen should remain the usable homepage, not a landing page.

## Reference Material
- User-requested design guidance: [frontend-design SKILL.md](https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md).
- Existing local visual references: `components/glass/*`, `lib/theme.ts`, `app/(app)/area/[id]/index.tsx`, and `app/(app)/event/[eventId]/index.tsx`.

## Likely Files And APIs
- `app/(app)/index.tsx` for layout and visual treatment.
- `components/home/home-section-header.tsx` for section actions.
- `components/ui/*` and `components/glass/*` for existing primitives.
- `lib/theme.ts` for app colors.
- Existing queries: `api.areas.listMyAreas`, `api.events.listMyEvents`, `api.events.listMyEndedEvents`, `api.eventMembers.listMyInvitations`, `api.friends.listPendingReceived`.

## Data Or API Changes
- No Convex schema changes expected.
- Avoid adding new data requirements unless the query already exists.

## Implementation Outline
- Audit area and hunt screens for spacing, button sizes, glass usage, map tone, and section density.
- Pick a specific visual direction before coding and document it briefly in the implementation PR.
- Rework the home composition around the user's real tasks instead of decorative dashboard filler.
- Make empty states feel useful and premium without becoming marketing cards.
- Reduce purely decorative background elements if they make the UI feel generic or inconsistent.
- Keep cards compact, avoid nesting cards, and ensure repeated list items remain scan-friendly.
- Keep text sizing appropriate for a dashboard, not a hero page.
- Verify the design across empty, partial, populated, and long-list states.

## Acceptance Criteria
- Homepage feels visually consistent with the area and hunt pages.
- Homepage still exposes profile/inbox, join hunt, create area, hunt list, area list, and supported history content.
- Empty states are clear and attractive without overwhelming the screen.
- Populated states remain compact and easy to scan.
- No CTA text or content overlaps on narrow screens.
- The page does not become a marketing/landing page.
- The visual treatment avoids generic purple gradients, decorative blobs, and one-note palettes.
- Navigation behavior remains unchanged except for intentional visual/control refinements.

## Test Plan
- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Use deterministic mocked/seeded home query states:
  - no hunts and no areas;
  - areas only;
  - active hunts plus areas;
  - active and ended hunts;
  - high inbox count.
- Capture screenshots or inspect simulator/browser output at a narrow phone viewport and a larger phone/tablet viewport.
- Verify all text fits inside buttons/cards and does not overlap.
- Verify action buttons route to `/join`, `/area/create`, profile, event detail, and area detail as expected.
- Run an accessibility smoke check for button labels and hit targets.

## Dependencies
- `01-home-dashboard-polish.md` describes earlier home behavior decisions and should be treated as background context.

## Out Of Scope
- Building profile, friends, invite inbox, or hunt history internals.
- Changing event/area data models.
- Adding new analytics or onboarding flows.
