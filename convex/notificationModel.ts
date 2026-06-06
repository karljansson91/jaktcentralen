import type { Doc } from "./_generated/dataModel";
import { v } from "convex/values";

export const notificationPlatformValidator = v.union(
  v.literal("ios"),
  v.literal("android")
);

export const notificationPermissionStatusValidator = v.union(
  v.literal("granted"),
  v.literal("denied"),
  v.literal("undetermined")
);

export type ResolvedNotificationPreferences = {
  allEnabled: boolean;
  chatEnabled: boolean;
  invitesEnabled: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: ResolvedNotificationPreferences = {
  allEnabled: true,
  chatEnabled: true,
  invitesEnabled: true,
};

export function resolveNotificationPreferences(
  preferences: Doc<"notificationPreferences"> | null | undefined
): ResolvedNotificationPreferences {
  return {
    allEnabled: preferences?.allEnabled ?? DEFAULT_NOTIFICATION_PREFERENCES.allEnabled,
    chatEnabled: preferences?.chatEnabled ?? DEFAULT_NOTIFICATION_PREFERENCES.chatEnabled,
    invitesEnabled: preferences?.invitesEnabled ?? DEFAULT_NOTIFICATION_PREFERENCES.invitesEnabled,
  };
}
