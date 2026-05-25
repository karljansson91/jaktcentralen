import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { isEventEnded } from "./eventLifecycle";
import { getCurrentUser } from "./helpers";
import { getAcceptedEventMembership } from "./eventAccess";
import { insertHuntMessage, markMembershipReadThroughMessage } from "./messageHelpers";

export const send = mutation({
  args: { eventId: v.id("events"), body: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const membership = await getAcceptedEventMembership(ctx, args.eventId, user._id);

    const event = await ctx.db.get(args.eventId);
    if (!event || isEventEnded(event)) {
      throw new Error("This hunt has ended");
    }

    const messageId = await insertHuntMessage(ctx, {
      eventId: args.eventId,
      userId: user._id,
      body: args.body,
      type: "text",
    });
    await markMembershipReadThroughMessage(ctx, membership._id, messageId);

    return messageId;
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

        return {
          ...msg,
          type,
          user: await ctx.db.get(msg.userId),
        };
      })
    );

    return { ...results, page };
  },
});
