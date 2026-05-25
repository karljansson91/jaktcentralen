# Hunt Allowed Game Rules

## Parent

GitHub issue #5: A couple things from the new build.

## Type

AFK - can start immediately.

## Fresh Session Brief

Implement this issue independently. Do not rely on prior chat context. This issue changes Convex event data, hunt creation/editing UI, home cards, hunt top-nav, and hunt info. Read `AGENTS.md` and `convex/_generated/ai/guidelines.md` before changing Convex code.

## What to build

Let hunt creators define which game is allowed for a hunt using simple structured species/options backed by stable IDs. The allowed-game rules can be set during hunt creation, edited by the creator/admin before or during an active hunt, shown compactly near the hunt title and on home cards, and shown fully in hunt info.

## Locked Decisions

- Use a local config file for allowed-game grouping, option IDs, and Swedish labels.
- Store stable IDs in Convex, not display labels.
- Include these initial groups in config:
  - `Klövvilt`
  - `Småvilt / övrigt`
  - `Fågel`
- Use species-first UI. Selecting a species opens subgroup chips/dropdown where relevant.
- Initial structured species/options should cover:
  - Älg: kalv, ko, tjur, tjur taggintervall, valfri vuxen.
  - Rådjur: kid, get, bock, valfri vuxen.
  - Dovhjort: kalv, hind, hjort, spets/ung hjort, valfri vuxen.
  - Kronhjort: kalv, hind, hjort, spets/ung hjort, valfri vuxen.
  - Vildsvin: årsgris, unggris, galt, sugga.
  - Räv, hare, grävling.
  - Skogsfågel, sjöfågel, kråkfågel, annan fågel.
- `Annat` opens an input where the creator can write any custom species/rule label.
- Multiple custom `Annat` rows are allowed.
- Each species row can be `Alla` or selected subgroup chips.
- Each species row can also have an optional free-text note.
- Allowed game is optional; creating a hunt must not require species.
- Allowed game is set during hunt creation and editable by creator/admin before or during active hunts.
- Ended hunts are read-only.
- No chat/system message is created for allowed-game changes in v1.
- Compact summary near hunt title/top nav shows species only and truncates when long.
- Pressing the compact title summary opens a polished popup/detail view with full rules.
- Full rules also appear under hunt info.
- Home hunt cards show species hints for all rendered hunts, including ended hunts when expanded.
- Keep this as one implementation issue.

## Acceptance criteria

- [ ] Hunt creation includes optional allowed-game selection.
- [ ] Creator/admin can edit allowed-game rules before or during an active hunt.
- [ ] Ended hunts do not allow allowed-game edits.
- [ ] Allowed-game data is stored with stable IDs and optional notes/custom labels.
- [ ] Species can be saved as `Alla` or with selected subgroup chips.
- [ ] `Annat` supports multiple custom rows with user-written labels.
- [ ] Hunt top/title area shows a truncated species-only summary when rules exist.
- [ ] Pressing the title summary opens a detail popup with all selected species, subgroups, and notes.
- [ ] Hunt info shows the full allowed-game details.
- [ ] Home hunt cards show species hints for all rendered hunts.
- [ ] No allowed-game chat/system messages are emitted in v1.

## Blocked by

None - can start immediately.

## Test plan

- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- Run the project's Convex codegen/check workflow.
- Add deterministic Convex tests for create/update/read allowed-game rules, including empty rules, `Alla`, selected subgroup IDs, notes, and multiple custom `Annat` rows.
- Verify non-creators cannot edit allowed-game rules.
- Verify ended hunts reject allowed-game edits.
- Use simulator or `localhost:3200` to verify hunt creation/edit forms, title summary truncation, popup detail, hunt info display, and home card hints.
- Verify narrow phone layouts do not overlap title, summary, or top-nav controls.
- Run the repo-local thermo-nuclear code quality review before committing implementation changes.

## Out of scope

- Legal hunting-time validation.
- Chat/system messages for rule changes.
- Invite preview before acceptance.
- Remote/config-driven taxonomy management.
