# Marker Image Upload Fix

## Fresh Session Brief
Implement this issue independently. Do not rely on prior chat context. This issue may touch Convex storage and area feature APIs, so read `convex/_generated/ai/guidelines.md` before changing Convex code.

## Goal
Fix image upload on area markers so users can add, save, view, and remove marker images reliably.

## User Story
As an area owner editing a marker, I want to upload photos to that marker, so the marker can carry useful visual context in the area.

## Current State
- Main route: `app/(app)/area/[id]/marker.tsx`.
- Image UI component: `components/area/image-grid.tsx`.
- Backend storage support appears to exist in `convex/areaFeatures.ts`.
- `expo-image-picker` is installed.
- Upload image on marker is reported broken.
- Current implementation should be audited end-to-end instead of assuming the breakage is only UI or only backend.

## Desired Behavior
- User can pick one or more images up to `MAX_MARKER_IMAGES`.
- Images upload to Convex storage through the approved upload URL flow.
- Saved marker images persist after leaving and reopening the marker.
- Existing marker images show remote URLs, not temporary local-only URIs after save.
- Removing an image from the marker form updates the saved marker's image list after save.
- Permission denial, canceled picker, upload failure, and save failure all show clear recoverable states.

## Likely Files And APIs
- `app/(app)/area/[id]/marker.tsx` for picker/upload/form behavior.
- `components/area/image-grid.tsx` for image display and remove controls.
- `components/area/marker-form-constants.ts` for `MAX_MARKER_IMAGES`.
- `lib/area-features.ts` and `lib/area-marker-form.ts` for image value mapping.
- `convex/areaFeatures.ts` for `generateUploadUrl`, save, list, and URL mapping.
- `convex/schema.ts` if the schema no longer matches the stored image model.

## Data Or API Changes
- Prefer no schema change if `areaFeatures.imageFileIds` already exists and is sufficient.
- Keep stored values as Convex storage IDs, not local device URIs.
- Ensure list/get APIs resolve storage IDs to usable image URLs for the client.
- Do not delete storage objects unless a clear cleanup API already exists or is intentionally added.

## Implementation Outline
- Reproduce the broken flow in code or simulator to identify whether failure occurs at permission, picker, fetch/blob upload, storage upload, mutation save, or URL rendering.
- Verify `generateUploadUrl` is callable by area owners and protected from non-owners.
- Verify uploaded storage IDs are included in the mutation payload.
- Verify save/list mappers preserve image order and resolve URLs.
- Make the UI distinguish uploading from saving and prevent duplicate taps while busy.
- Confirm image previews use local URIs immediately after upload and resolved storage URLs after reload.
- Add deterministic tests around data mapping and API permissions where possible.

## Acceptance Criteria
- Adding a marker image succeeds for a new marker.
- Adding a marker image succeeds for an existing marker.
- Saved marker images reappear after closing and reopening the marker editor.
- Marker image count cannot exceed `MAX_MARKER_IMAGES`.
- Removing an image and saving persists the removal.
- Upload/save errors show an actionable alert and do not corrupt existing images.
- Non-area owners cannot upload/save images to someone else's marker through backend APIs.

## Test Plan
- Run `npm run lint`.
- Run `npx tsc --noEmit`.
- If Convex functions/schema changed, run the repo's Convex codegen/check workflow.
- Add or extend deterministic tests for `areaFeatures.save` image ID handling.
- Add or extend tests for listing area features with image URL resolution.
- Mock or fixture the storage ID/upload URL path rather than requiring manual photo selection in automated tests.
- If simulator is available, manually exercise picker permission granted, picker cancel, add image, save, reopen, remove image, and save again.
- Run `npx expo-doctor@latest` only if native dependency/config changes are made.

## Dependencies
- Related broader planning exists in `07-station-assignment-and-marker-media.md`, but this issue should focus only on marker image upload reliability.

## Out Of Scope
- Participant station assignment.
- Image cropping, compression UI, captions, or gallery fullscreen.
- Storage garbage collection for abandoned uploads unless needed to fix the bug safely.
