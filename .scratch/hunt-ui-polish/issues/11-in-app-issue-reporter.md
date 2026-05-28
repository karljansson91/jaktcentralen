# Add In-App Issue Reporter

Type: AFK

## What

After a two-finger long press for 5 seconds in the logged-in app, open a report screen with a screenshot of the previous screen, title, description, and issue type. Submitting stores the issue in Convex, including the screenshot and reporter info.

Enable this for all builds/users, not only development or simulator builds.

Any logged-in user can create a report. Store reporter user info on the issue so reports can be traced.

Signed-out users cannot submit reports. Keep the signed-out behavior minimal, such as a short `Logga in för att rapportera` message.

The gesture should only be active inside the logged-in app shell, not auth screens. Ignore the gesture while a text input is active.

Capture the current screen before opening the report screen, then show that screenshot as a preview at the top of the report form.

Require both title and description before submitting.

Store issues in Convex, not GitHub. Issue type is `bug` or `feature`. Issue status is `triage`, `ready_to_implement`, `ongoing`, or `completed`.

Newly reported issues always start with status `triage`.

Store screenshots in Convex storage and save the storage id on the issue. Do not store base64 screenshots directly in issue documents.

Add a profile entry for viewing/editing issues. The issue list should support useful sorting/filtering, including issues created by you and status.

The profile issue list should default to all issues for all users, newest first. Keep filters for status/type/reporter useful, but do not hide other users' issues by default.

Skip comments for the first version. Keep issue fields to title, description, screenshot, reporter, type, status, and timestamps.

Add an LLM-friendly script for reading issues from production and updating them, since implementation work will often be driven from this issue list.

The script should operate by Convex issue id and support clear commands such as `list`, `show`, `update-status`, and `delete`. Output should be JSON-friendly so an offline Codex session can consume it safely.

Also add a repo-local agent skill for future sessions, for example `.agents/skills/jaktcentralen-issues/SKILL.md`, that explains how to use the script to list issues, inspect one issue, update status, and delete issues.

The script should read the repo env `CODEX_CONVEX_KEY` as the production deploy key and pass it to Convex CLI subprocesses as `CONVEX_DEPLOY_KEY` only for that command. Fail with a clear message if the key is missing.

Prefer a small Node script that wraps Convex CLI calls with `CODEX_CONVEX_KEY` mapped to `CONVEX_DEPLOY_KEY`. Only use the Convex JS client directly if it can authenticate cleanly without adding public admin functions or extra secrets. The script should not require normal user auth.

The issue reporter screen should use the same Expo Router modal style as the app's edit/info screens, with screenshot preview, type selector, title, description, and submit.

Issue list/detail/edit screens should live under profile as normal pushed screens, not modals. The quick reporter is the modal.

For now, any logged-in user can create, edit, and delete any issue. Do not add roles or admin-only permissions in this issue.

## Done

- [ ] Two-finger 5-second long press opens the report screen
- [ ] Reporter is available in production too
- [ ] Only logged-in users can submit reports
- [ ] Any logged-in user can create, edit, and delete issues
- [ ] Gesture is only active after login and does not interfere with typing
- [ ] Previous screen screenshot is shown
- [ ] Screenshot is captured before navigation to the report screen
- [ ] User can enter title, description, and issue type
- [ ] Title and description are required
- [ ] Convex stores issues with screenshot, reporter, type, and status
- [ ] Screenshots use Convex storage
- [ ] Issue type supports `bug` and `feature`
- [ ] Issue status supports `triage`, `ready_to_implement`, `ongoing`, and `completed`
- [ ] Newly reported issues default to `triage`
- [ ] Profile has a view/edit issues entry
- [ ] Issue list shows all users' issues by default
- [ ] Issue list supports filtering/sorting by reporter, type, and status
- [ ] No comments system in the first version
- [ ] LLM-friendly script can list and update production issues
- [ ] Script supports list/show/update-status/delete by Convex issue id
- [ ] Script uses `CODEX_CONVEX_KEY` as an explicit prod access key
- [ ] Script can run against prod without normal user auth
- [ ] Repo-local agent skill documents the issue script workflow
- [ ] Reporter screen uses the app's standard modal/edit presentation
- [ ] Issue management screens live under profile navigation
