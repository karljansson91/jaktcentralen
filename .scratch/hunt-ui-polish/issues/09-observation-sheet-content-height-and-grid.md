# Improve Mark Observation Sheet Layout

Type: AFK

## What

Make the mark observation sheet height fit all options. Remove misleading right arrows and present smaller option buttons in a clearer grid.

Use a compact two-column grid for animal options: color dot plus animal name, no chevrons. On very narrow screens, fall back to one column if needed.

Selecting an animal should immediately create the observation and close the sheet. Do not add a confirmation step.

Use Expo Router/native sheet presentation with content-height/fit-to-content sizing so all options are visible without awkward fixed sheet height.

Keep the title `Vad såg du?` and remove the explanatory subtitle in the normal state. Only show explanatory text when the coordinate is missing.

## Done

- [ ] Sheet uses native content-height sizing and fits available options
- [ ] No navigation arrows on non-navigation actions
- [ ] Options use a compact two-column grid where space allows
- [ ] Marking an observation still works
- [ ] Selecting an animal still saves immediately and closes the sheet
- [ ] Normal state uses only the short title, no obvious subtitle
