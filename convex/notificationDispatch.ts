import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalQuery, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { resolveNotificationPreferences } from "./notificationModel";

type NotificationKind = "chat" | "invite";

export type ExpoPushMessage = {
  body: string;
  data:
    | {
        eventId: Id<"events">;
        kind: "chat";
      }
    | {
        eventId: Id<"events">;
        kind: "event_invite";
        memberId: Id<"eventMembers">;
      }
    | {
        kind: "test";
      };
  title: string;
  to: string;
};

const CHAT_PREVIEW_MAX_LENGTH = 100;
const EXPO_PUSH_API_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_PUSH_CHUNK_SIZE = 100;

function getPreferenceField(kind: NotificationKind) {
  return kind === "chat" ? "chatEnabled" : "invitesEnabled";
}

function getDisplayName(user: Doc<"users"> | null, fallback: string) {
  return user?.name?.trim() || user?.clerkName?.trim() || fallback;
}

function getChatPreview(message: Doc<"messages">) {
  const body = message.body.trim().replace(/\s+/g, " ");
  const preview = body || (message.type === "image" ? "Bild" : "");
  return preview.length > CHAT_PREVIEW_MAX_LENGTH
    ? preview.slice(0, CHAT_PREVIEW_MAX_LENGTH)
    : preview;
}

async function getNotificationDevicesForUser(
  ctx: QueryCtx,
  userId: Id<"users">,
  kind: NotificationKind
) {
  const preferences = await ctx.db
    .query("notificationPreferences")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
  const resolvedPreferences = resolveNotificationPreferences(preferences);

  if (!resolvedPreferences.allEnabled || !resolvedPreferences[getPreferenceField(kind)]) {
    return [];
  }

  return await getActiveDevicesForUser(ctx, userId);
}

async function getActiveDevicesForUser(ctx: QueryCtx, userId: Id<"users">) {
  const devices = await ctx.db
    .query("notificationDevices")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(20);

  return devices.filter(
    (device) =>
      device.enabled &&
      device.permissionStatus === "granted" &&
      typeof device.expoPushToken === "string" &&
      device.expoPushToken.length > 0
  );
}

function messagesForDevices(
  devices: Doc<"notificationDevices">[],
  message: Omit<ExpoPushMessage, "to">
) {
  return devices.flatMap((device) =>
    device.expoPushToken
      ? [
          {
            ...message,
            to: device.expoPushToken,
          },
        ]
      : []
  );
}

export async function sendExpoPushMessages(messages: ExpoPushMessage[]) {
  for (let start = 0; start < messages.length; start += EXPO_PUSH_CHUNK_SIZE) {
    const chunk = messages.slice(start, start + EXPO_PUSH_CHUNK_SIZE);
    if (chunk.length === 0) {
      continue;
    }

    const response = await fetch(EXPO_PUSH_API_URL, {
      body: JSON.stringify(
        chunk.map((message) => ({
          body: message.body,
          data: message.data,
          sound: "default",
          title: message.title,
          to: message.to,
        }))
      ),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    if (!response.ok) {
      console.error("Expo push request failed", response.status, await response.text());
      continue;
    }

    const result = await response.json().catch(() => null);
    const tickets = Array.isArray(result?.data) ? result.data : [];
    const errors = tickets.filter(
      (ticket: { status?: string } | null | undefined) => ticket?.status === "error"
    );
    if (errors.length > 0) {
      console.error("Expo push tickets returned errors", JSON.stringify(errors));
    }
  }
}

export const buildChatPushMessages = internalQuery({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args): Promise<ExpoPushMessage[]> => {
    const message = await ctx.db.get(args.messageId);
    if (!message || (message.type !== undefined && message.type !== "text" && message.type !== "image")) {
      return [];
    }

    const [event, sender] = await Promise.all([
      ctx.db.get(message.eventId),
      ctx.db.get(message.userId),
    ]);
    if (!event || !sender) {
      return [];
    }

    const preview = getChatPreview(message);
    if (!preview) {
      return [];
    }

    const members = await ctx.db
      .query("eventMembers")
      .withIndex("by_eventId_and_status", (q) =>
        q.eq("eventId", message.eventId).eq("status", "accepted")
      )
      .take(500);

    const pushMessages: ExpoPushMessage[] = [];
    for (const member of members) {
      if (member.userId === message.userId) {
        continue;
      }

      const devices = await getNotificationDevicesForUser(ctx, member.userId, "chat");
      pushMessages.push(
        ...messagesForDevices(devices, {
          body: `${getDisplayName(sender, "Jägare")}: ${preview}`,
          data: { kind: "chat", eventId: message.eventId },
          title: `Nytt meddelande i ${event.title}`,
        })
      );
    }

    return pushMessages;
  },
});

export const buildInvitePushMessages = internalQuery({
  args: {
    inviterUserId: v.id("users"),
    memberId: v.id("eventMembers"),
  },
  handler: async (ctx, args): Promise<ExpoPushMessage[]> => {
    const member = await ctx.db.get(args.memberId);
    if (!member || member.status !== "invited") {
      return [];
    }

    const [event, inviter] = await Promise.all([
      ctx.db.get(member.eventId),
      ctx.db.get(args.inviterUserId),
    ]);
    if (!event) {
      return [];
    }

    const devices = await getNotificationDevicesForUser(ctx, member.userId, "invite");
    return messagesForDevices(devices, {
      body: `${getDisplayName(inviter, "Jaktledaren")}: ${event.title}`,
      data: {
        eventId: event._id,
        kind: "event_invite",
        memberId: member._id,
      },
      title: "Ny jaktinbjudan",
    });
  },
});

export const buildTestPushMessages = internalQuery({
  args: { tokenIdentifier: v.string() },
  handler: async (ctx, args): Promise<ExpoPushMessage[]> => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", args.tokenIdentifier)
      )
      .unique();
    if (!user) {
      return [];
    }

    const devices = await getActiveDevicesForUser(ctx, user._id);
    return messagesForDevices(devices, {
      body: "Jaktcentralen kan skicka notiser till den här enheten.",
      data: { kind: "test" },
      title: "Testnotis",
    });
  },
});

export const sendChatMessage = internalAction({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const messages: ExpoPushMessage[] = await ctx.runQuery(
      internal.notificationDispatch.buildChatPushMessages,
      args
    );
    await sendExpoPushMessages(messages);
  },
});

export const sendEventInvite = internalAction({
  args: {
    inviterUserId: v.id("users"),
    memberId: v.id("eventMembers"),
  },
  handler: async (ctx, args) => {
    const messages: ExpoPushMessage[] = await ctx.runQuery(
      internal.notificationDispatch.buildInvitePushMessages,
      args
    );
    await sendExpoPushMessages(messages);
  },
});
