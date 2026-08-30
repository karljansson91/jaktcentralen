import { v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { getCurrentUser } from "./helpers";
import { getAcceptedEventMembership } from "./eventAccess";
import { recordHuntActivity } from "./huntActivity";
import type { Id } from "./_generated/dataModel";

async function buildMessageImages(
  ctx: QueryCtx,
  imageFileIds: Id<"_storage">[]
): Promise<{ fileId: Id<"_storage">; url: string }[]> {
  const images = await Promise.all(
    imageFileIds.map(async (fileId) => {
      const url = await ctx.storage.getUrl(fileId);
      return url ? { fileId, url } : null;
    })
  );

  return images.filter((image): image is { fileId: Id<"_storage">; url: string } => image !== null);
}

export const send = mutation({
  args: { eventId: v.id("events"), body: v.string() },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await getAcceptedEventMembership(ctx, args.eventId, user._id);

    return await recordHuntActivity(ctx, {
      activity: { body: args.body, kind: "text_message" },
      actor: user,
      eventId: args.eventId,
    });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getCurrentUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const sendImage = mutation({
  args: {
    body: v.string(),
    eventId: v.id("events"),
    imageFileIds: v.array(v.id("_storage")),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await getAcceptedEventMembership(ctx, args.eventId, user._id);

    return await recordHuntActivity(ctx, {
      activity: {
        body: args.body,
        imageFileIds: args.imageFileIds,
        kind: "image_message",
      },
      actor: user,
      eventId: args.eventId,
    });
  },
});

export const getUnreadCount = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const membership = await getAcceptedEventMembership(ctx, args.eventId, user._id);

    const lastReadAt = membership.lastReadMessageAt ?? 0;
    const latestMessages = await ctx.db
      .query("messages")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .order("desc")
      .take(100);

    let count = 0;
    for (const message of latestMessages) {
      if (message._creationTime <= lastReadAt) {
        break;
      }
      if (message.userId !== user._id) {
        count += 1;
      }
    }

    return count;
  },
});

export const markRead = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const membership = await getAcceptedEventMembership(ctx, args.eventId, user._id);

    const latestMessage = await ctx.db
      .query("messages")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .order("desc")
      .first();

    const readAt = Math.max(
      membership.lastReadMessageAt ?? 0,
      latestMessage?._creationTime ?? Date.now()
    );

    await ctx.db.patch(membership._id, { lastReadMessageAt: readAt });
  },
});

export const list = query({
  args: { eventId: v.id("events"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await getAcceptedEventMembership(ctx, args.eventId, user._id);

    const results = await ctx.db
      .query("messages")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .order("desc")
      .paginate(args.paginationOpts);

    // Join user profiles
    const page = await Promise.all(
      results.page.map(async (msg) => {
        const type = msg.type ?? "text";
        const images = msg.type === "image" ? await buildMessageImages(ctx, msg.imageFileIds) : [];
        const sighting =
          msg.type === "animal_sighting" ? await ctx.db.get(msg.sightingId) : null;

        return {
          ...msg,
          ...(sighting ? { animal: sighting.animal } : {}),
          images,
          type,
          user: await ctx.db.get(msg.userId),
        };
      })
    );

    return { ...results, page };
  },
});

export const getImageMessage = query({
  args: {
    eventId: v.id("events"),
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await getAcceptedEventMembership(ctx, args.eventId, user._id);

    const message = await ctx.db.get(args.messageId);
    if (!message || message.eventId !== args.eventId || message.type !== "image") {
      throw new Error("Image message not found");
    }

    return {
      ...message,
      images: await buildMessageImages(ctx, message.imageFileIds),
      type: "image" as const,
      user: await ctx.db.get(message.userId),
    };
  },
});
