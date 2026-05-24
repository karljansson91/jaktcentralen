import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { isEventEnded } from "./eventLifecycle";
import { getCurrentUser } from "./helpers";
import type { Id } from "./_generated/dataModel";

async function getAcceptedMembership(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<"events">,
  userId: Id<"users">
) {
  const membership = await ctx.db
    .query("eventMembers")
    .withIndex("by_eventId_and_userId", (q) =>
      q.eq("eventId", eventId).eq("userId", userId)
    )
    .unique();

  if (!membership || membership.status !== "accepted") {
    throw new Error("Not an accepted member");
  }

  return membership;
}

export const send = mutation({
  args: { eventId: v.id("events"), body: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const membership = await getAcceptedMembership(ctx, args.eventId, user._id);

    const event = await ctx.db.get(args.eventId);
    if (!event || isEventEnded(event)) {
      throw new Error("This hunt has ended");
    }

    const messageId = await ctx.db.insert("messages", {
      eventId: args.eventId,
      userId: user._id,
      body: args.body,
    });
    const message = await ctx.db.get(messageId);
    if (message) {
      await ctx.db.patch(membership._id, { lastReadMessageAt: message._creationTime });
    }

    return messageId;
  },
});

export const getUnreadCount = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const membership = await getAcceptedMembership(ctx, args.eventId, user._id);

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
    const membership = await getAcceptedMembership(ctx, args.eventId, user._id);

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
    await getAcceptedMembership(ctx, args.eventId, user._id);

    const results = await ctx.db
      .query("messages")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .order("desc")
      .paginate(args.paginationOpts);

    // Join user profiles
    const page = await Promise.all(
      results.page.map(async (msg) => ({
        ...msg,
        user: await ctx.db.get(msg.userId),
      }))
    );

    return { ...results, page };
  },
});
