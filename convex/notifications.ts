import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, mutation, query } from "./_generated/server";
import { getCurrentUser } from "./helpers";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  notificationPermissionStatusValidator,
  notificationPlatformValidator,
  resolveNotificationPreferences,
} from "./notificationModel";
import {
  sendExpoPushMessages,
  type ExpoPushMessage,
} from "./notificationDispatch";

export const getPreferences = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const preferences = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    return resolveNotificationPreferences(preferences);
  },
});

export const updatePreferences = mutation({
  args: {
    allEnabled: v.optional(v.boolean()),
    chatEnabled: v.optional(v.boolean()),
    invitesEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const existing = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    const now = Date.now();
    const updates = {
      ...(args.allEnabled !== undefined ? { allEnabled: args.allEnabled } : {}),
      ...(args.chatEnabled !== undefined ? { chatEnabled: args.chatEnabled } : {}),
      ...(args.invitesEnabled !== undefined ? { invitesEnabled: args.invitesEnabled } : {}),
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, updates);
      return resolveNotificationPreferences({ ...existing, ...updates });
    }

    const preferenceId = await ctx.db.insert("notificationPreferences", {
      userId: user._id,
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...updates,
    });
    const preferences = await ctx.db.get(preferenceId);
    return resolveNotificationPreferences(preferences);
  },
});

export const registerDevice = mutation({
  args: {
    expoPushToken: v.optional(v.string()),
    installationId: v.string(),
    permissionStatus: notificationPermissionStatusValidator,
    platform: notificationPlatformValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const now = Date.now();
    const enabled =
      args.permissionStatus === "granted" && Boolean(args.expoPushToken?.trim());

    const sameInstallationDevices = await ctx.db
      .query("notificationDevices")
      .withIndex("by_installationId", (q) =>
        q.eq("installationId", args.installationId)
      )
      .take(20);

    for (const device of sameInstallationDevices) {
      if (device.userId !== user._id && device.enabled) {
        await ctx.db.patch(device._id, { enabled: false });
      }
    }

    const existing = await ctx.db
      .query("notificationDevices")
      .withIndex("by_userId_and_installationId", (q) =>
        q.eq("userId", user._id).eq("installationId", args.installationId)
      )
      .unique();

    const device = {
      enabled,
      expoPushToken: args.expoPushToken?.trim() || undefined,
      installationId: args.installationId,
      lastRegisteredAt: now,
      permissionStatus: args.permissionStatus,
      platform: args.platform,
      userId: user._id,
    };

    if (existing) {
      await ctx.db.patch(existing._id, device);
      return existing._id;
    }

    return await ctx.db.insert("notificationDevices", device);
  },
});

export const unregisterDevice = mutation({
  args: { installationId: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const existing = await ctx.db
      .query("notificationDevices")
      .withIndex("by_userId_and_installationId", (q) =>
        q.eq("userId", user._id).eq("installationId", args.installationId)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { enabled: false });
    }
  },
});

export const testSendToMe = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const messages: ExpoPushMessage[] = await ctx.runQuery(
      internal.notificationDispatch.buildTestPushMessages,
      { tokenIdentifier: identity.tokenIdentifier }
    );
    await sendExpoPushMessages(messages);
    return { sent: messages.length };
  },
});
